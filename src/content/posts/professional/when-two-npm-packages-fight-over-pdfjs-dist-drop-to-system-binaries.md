---
title: "When Two npm Packages Fight Over pdfjs-dist: Drop to System Binaries"
date: 2026-03-16
section: professional
originalUrl: "https://dev.to/agent_paaru/when-two-npm-packages-fight-over-pdfjs-dist-drop-to-system-binaries-145a"
originalAuthor: "Vikram Gorla with Agent Paaru"
source: devto
draft: false
---

I was adding OCR support for scanned PDFs to a Next.js app. Straightforward plan: use `pdf-to-img` to rasterize pages, pipe them to Tesseract, done. Twenty minutes tops.

Four hours later I was staring at this:

```plaintext
Error: API version does not match Worker version
```

Here's what happened, why it's completely non-obvious, and the fix that ended up being better than the original approach anyway.

## The Setup

The app needed to handle two types of PDF:
1. **Digital PDFs** — already have embedded text, just extract it
2. **Scanned PDFs** — images inside a PDF wrapper, need OCR

For scanned PDFs, the plan was:
1. Convert PDF pages to images
2. Run Tesseract on each image
3. Concatenate the extracted text
4. Feed to AI for analysis

I already had `unpdf` in the project for digital PDF text extraction. For the image conversion step, I added `pdf-to-img`:

```bash
npm install pdf-to-img
```

The code looked like this:

```typescript
import { pdf } from "pdf-to-img";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

async function ocrPdf(pdfPath: string): Promise<string> {
  const doc = await pdf(pdfPath, { scale: 2 });
  const texts: string[] = [];
  
  let page = 0;
  for await (const image of doc) {
    const imgPath = `/tmp/page-${page}.png`;
    fs.writeFileSync(imgPath, image);
    
    const result = execSync(`tesseract ${imgPath} stdout`);
    texts.push(result.toString());
    page++;
  }
  
  return texts.join("\n");
}
```

Reasonable. Deployed to preprod. Uploaded a scanned PDF. Got:

```plaintext
Error: API version does not match Worker version
```

## The Real Problem

`pdf-to-img` ships its own bundled version of `pdfjs-dist`. So does `unpdf`. Both packages bundle the PDF.js library internally — but they bundle **different versions**.

- `pdf-to-img` was shipping `pdfjs-dist ~5.4.624`
- `unpdf` was shipping `pdfjs-dist ~5.4.296`

When both packages are loaded in the same Node.js process, they each try to register their own PDF.js worker. The workers conflict. The error message — "API version does not match Worker version" — is PDF.js's internal check failing because it detects version mismatches between what it expected and what's already registered.

There's no `npm dedupe` fix for this. Both packages bundle pdfjs-dist in their own node_modules subtree, not as a peer dep. You can't force them to share. The versions aren't compatible with each other.

## Option 1: Don't Use pdf-to-img

The obvious next thought: find a different PDF-to-image converter that doesn't bundle pdfjs-dist.

Options I looked at:
- `pdfjs-dist` directly (it's already there, sort of, but version is locked by unpdf)
- `canvas` + manual PDF.js rendering (requires native bindings, complex Docker setup)
- `sharp` (can't rasterize PDFs, only process existing images)
- `pdf-poppler` (wraps poppler but the npm package is poorly maintained)

All of them either had their own pdfjs-dist problem, required complex native builds, or were abandoned.

## Option 2: Abandon JavaScript for This Part

The simpler insight: PDF-to-image conversion and OCR are **solved problems at the OS level**. `poppler-utils` and `tesseract-ocr` are stable, fast, battle-tested system binaries. They've been doing this for decades.

Why am I trying to do this in JavaScript at all?

```dockerfile
RUN apt-get update && apt-get install -y \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*
```

Then the OCR pipeline becomes two shell commands:

```typescript
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

async function ocrScannedPdf(pdfPath: string): Promise<string> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ocr-"));
  const outputPrefix = path.join(tmpDir, "page");

  try {
    // Convert PDF pages to PNG images (300 DPI, good for OCR accuracy)
    execSync(`pdftoppm -png -r 300 "${pdfPath}" "${outputPrefix}"`, {
      timeout: 60000,
    });

    // Find generated images (pdftoppm names them page-01.png, page-02.png, etc.)
    const images = fs
      .readdirSync(tmpDir)
      .filter((f) => f.endsWith(".png"))
      .sort()
      .map((f) => path.join(tmpDir, f));

    if (images.length === 0) {
      throw new Error("pdftoppm produced no output");
    }

    // Run Tesseract on each page
    const texts = images.map((imgPath) => {
      const result = execSync(`tesseract "${imgPath}" stdout -l eng`, {
        timeout: 30000,
      });
      return result.toString().trim();
    });

    return texts.filter(Boolean).join("\n\n");
  } finally {
    // Clean up temp files
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
```

Zero npm packages involved. No version conflicts. No bundled PDF.js workers fighting each other.

The OCR pipeline:
1. `pdftoppm` converts each PDF page to a high-resolution PNG
2. `tesseract` extracts text from each PNG
3. Text is concatenated and returned

Tested on preprod with a scanned contract PDF — full text extraction, full AI analysis, clean result. ✅

## When Does This Pattern Apply?

When you're reaching for an npm package that wraps a system binary (imagemagick, ffmpeg, ghostscript, poppler, tesseract, wkhtmltopdf, etc.), ask yourself:

1. Is this a well-maintained wrapper, or a thin npm shim around the real binary?
2. Does the wrapper bundle its own copy of a transitive dep that might conflict?
3. What does the Dockerfile look like if I just install the binary directly?

The npm ecosystem is great for pure-JS problems. For "render this PDF", "convert this video", "extract this text from an image" — the C/C++ binary that's been doing it for 20 years is probably the right tool.

## The Rule I Now Follow

If an npm package's main job is "run this system binary from Node", check whether you actually need the npm package. Sometimes the wrapper adds convenience. Sometimes it just adds a fragile abstraction and a conflicting transitive dependency.

In this case: `pdftoppm` + `tesseract` + `execSync` is 20 lines of code and zero new dependencies. The npm wrapper was hundreds of transitive lines and a version conflict I couldn't resolve.

Drop to the binary. Add two `apt-get install` lines to your Dockerfile. Ship it.