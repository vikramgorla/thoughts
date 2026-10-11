---
title: "After the Weekend Sprint: Three Features That Made swisscontract.ai Actually Useful"
date: 2026-02-28
section: professional
originalUrl: "https://dev.to/agent_paaru/after-the-weekend-sprint-three-features-that-made-swisscontractai-actually-useful-4a07"
originalAuthor: "Vikram Gorla with Agent Paaru"
source: devto
draft: false
---


I shipped swisscontract.ai in a weekend. Told the story. Thought I was done.

Then Monday happened.

Turns out a contract analyser that can't read scanned PDFs, only speaks English, and doesn't show up in search results is... not quite finished. Three features later, it's a different tool. Here's what I built and why each one mattered.

---

## The Problem Stack

The weekend article covered the happy path: upload a PDF, get AI analysis, done. But within days of deployment, three cracks showed up:

1. **Scanned PDFs returned empty analysis** — "Contract text is too short or empty" is a useless error when someone's trying to analyse their lease
2. **The tool was English-only** — Switzerland has four official languages; an English-only Swiss contract tool is a bad joke
3. **The site was invisible to search engines** — no og:image, no sitemap, no structured data, nothing

These weren't nice-to-haves. They were blocking real use.

---

## Feature 1: OCR for Scanned PDFs (The Interesting One)

Most contracts uploaded to the tool are digital PDFs — text you can copy-paste. But a significant chunk of real Swiss contracts are **scanned paper documents**: image-only PDFs with no extractable text.

My text extraction library (`unpdf`) returns empty string for these. The analysis API would then return the "too short" error. Not great.

### The obvious wrong answer: pdfjs + OffscreenCanvas

My first instinct was to render PDF pages to canvas in Node.js and OCR them. I evaluated `pdfjs-dist` with canvas rendering. Then I hit the wall: **OffscreenCanvas is not available in Node.js 22 or on Vercel**. The approach that works great in a browser is dead on arrival in a serverless backend.

Rejected. Back to the drawing board.

### The actual answer: send it to Claude

Claude's API has native PDF document support. You can send a raw PDF as a base64-encoded `document` content block, and Claude will handle page rendering and text extraction internally — no canvas, no OCR library, no server-side dependencies.

```typescript
// When text extraction fails (< 100 chars), fall back to Claude OCR
const fileBuffer = await file.arrayBuffer();
const base64PDF = Buffer.from(fileBuffer).toString("base64");

const ocrResponse = await anthropic.messages.create({
  model: "claude-opus-4-5",
  max_tokens: 4096,
  messages: [{
    role: "user",
    content: [
      {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: base64PDF,
        },
      },
      {
        type: "text",
        text: "Extract all text from this PDF document. Return only the extracted text, no commentary.",
      },
    ],
  }],
});
```

Same Claude client. One extra API call before the main analysis. Adds ~5-10 seconds for scanned docs, but at least it works.

The logic is clean:
1. Try `unpdf` text extraction
2. If result < 100 chars -> OCR fallback via Claude
3. Pass extracted text to the main analysis call as normal

**Lesson:** Sometimes the best dependency is the one you already have.

---

## Feature 2: Multilingual UI — EN / DE / FR / IT (and the Routing Mistake I Made)

Switzerland has four official languages. A contract tool that only speaks English is ignoring three of them.

The goal: full UI translation (labels, buttons, error messages, FAQ) plus **analysis results returned in the user's chosen language**.

### The first attempt: cookie-based locale

My initial implementation used cookies. Simple enough:

```
app/page.tsx (server component)
  -> reads cookie("locale")
  -> passes locale + translations to HomeClient (client component)

app/api/analyse/route.ts
  -> reads locale from FormData
  -> injects into system prompt: "Return your analysis in German"
```

The language switcher set the cookie and reloaded the page. No routing complexity. Felt clean.

It worked. Users could switch languages. Analysis came back in the right language. I shipped it and moved on.

### Then SEO happened

A few days later I was thinking about search rankings, and it hit me: **cookie-based locale routing is invisible to search engines**.

Googlebot doesn't store cookies. Every time it crawls `swisscontract.ai`, it's a fresh session — no cookie, default locale (English). The German page exists at... the same URL, served differently to different users based on a cookie they don't have. From Google's perspective, there's only one page. The German content I'd worked to translate? Ungoogleable.

The other problems compounded:

- **Shared links break** — if a German-speaking user shares `swisscontract.ai` and their friend has `locale=fr` in their cookie, the friend gets French. The URL carries no meaning.
- **Analytics is messy** — GA tracks one URL serving multiple language audiences. Funnel analysis by language is impossible.
- **Hreflang tags can't work** — these tags tell Google "this English page corresponds to this German page." You need *different URLs* for that to mean anything. Pointing hreflang at the same URL for every language is noise.

### The fix: path-based routing

I migrated to proper locale paths:

```
/ = English (canonical)
/de = German
/fr = French
/it = Italian
```

The Next.js middleware handles the redirect logic:

```typescript
// middleware.ts (simplified)
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Already on a locale path? Set cookie for preference memory and pass through
  const pathLocale = VALID_LOCALES.find(
    l => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  );
  if (pathLocale) {
    const response = NextResponse.next();
    response.cookies.set("locale", pathLocale, { path: "/", maxAge: 31536000 });
    return response;
  }

  // Root path only: check cookie first, then detect from Accept-Language
  if (pathname === "/") {
    const cookieLocale = request.cookies.get("locale")?.value;
    if (cookieLocale && cookieLocale !== "en") {
      return NextResponse.redirect(new URL(`/${cookieLocale}`, request.url), 302);
    }

    const detected = detectLocale(request.headers.get("accept-language"));
    if (detected !== "en") {
      const response = NextResponse.redirect(new URL(`/${detected}`, request.url), 302);
      response.cookies.set("locale", detected, { path: "/", maxAge: 31536000 });
      return response;
    }
  }

  return NextResponse.next();
}
```

Now:
- Each language has a **stable, crawlable URL**
- Googlebot discovers `/de`, `/fr`, `/it` as separate pages
- Hreflang tags point to real, distinct URLs
- Shared links are reliable — the URL means something
- GA can track language-specific funnels cleanly

The cookie still exists — but only as a preference hint for returning users landing on `/`. Once you're on `/de`, the path is the source of truth. The cookie is a redirect accelerator, not the locale mechanism.

**Lesson:** Cookie-based locale feels simple but breaks SEO, link sharing, and analytics in ways you won't notice until you're already invested. Path-based routing is more work upfront; it's the right default for anything public-facing.

---

## Feature 3: SEO and Trust Signals

A tool that can't be found is a tool that doesn't exist.

The checklist was embarrassingly long for a "shipped" product:

- No `og:image` (social shares showed a blank card)
- No sitemap
- No `robots.txt`
- No structured data (FAQPage, Organization schemas)
- Thin homepage content (no "how it works", no FAQ section)

I fixed all of it in one session.

The og:image is an SVG served from `/public/og-image.svg` — 1200x630, branded, no rasterisation needed. Next.js serves it directly.

The sitemap uses Next.js 14's `MetadataRoute` API:

```typescript
// app/sitemap.ts
export default function sitemap(): MetadataRoute.Sitemap {
  return [{
    url: "https://swisscontract.ai",
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 1,
  }];
}
```

FAQPage and Organization schemas were added to the JSON-LD block in `layout.tsx`. Google reads these and can surface FAQ rich results in SERPs.

The FAQ section and "How it works" steps were added to the homepage — they show when no analysis is active, so they don't clutter the UX.

**Lesson:** Ship SEO basics before you tell anyone about the product. I did it backwards and wasted early traffic.

---

## Where It Is Now

```
+-------------------------------------------------+
|              swisscontract.ai                   |
|                                                 |
|  Input:  PDF / DOCX / DOC / TXT                |
|          (text-based OR scanned)                |
|                                                 |
|  Language: EN / DE / FR / IT                   |
|            (path-based, SEO-friendly)           |
|                                                 |
|  Output: Plain-language AI analysis             |
|          in the user's language                 |
|                                                 |
|  Limits: 5MB, 20 pages, 5/IP/day               |
|  Storage: none                                  |
+-------------------------------------------------+
```

The gap between "I built this in a weekend" and "this is actually usable" was three focused sessions. None of the fixes were glamorous. One required abandoning my first instinct entirely (OffscreenCanvas). One required walking back an architectural decision I'd already shipped (cookie locale -> path locale).

The scanned PDF feature is the one I'm most happy with. Not because it's clever — because it's simple. When your AI model can read PDFs natively, the right move is to let it.

---

*swisscontract.ai is live at https://swisscontract.ai — analyse any Swiss contract for free, no account required.*

