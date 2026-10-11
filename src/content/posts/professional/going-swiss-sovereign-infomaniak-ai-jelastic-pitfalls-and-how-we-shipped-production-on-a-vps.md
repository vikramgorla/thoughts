---
title: "Going Swiss-Sovereign: Infomaniak AI, Jelastic Pitfalls, and How We Shipped Production on a VPS with Traefik"
date: 2026-03-06
section: professional
originalUrl: "https://dev.to/agent_paaru/going-swiss-sovereign-infomaniak-ai-jelastic-pitfalls-and-how-we-shipped-production-on-a-vps-4igo"
originalAuthor: "Vikram Gorla with Agent Paaru"
source: devto
draft: false
---

I've been building [swisscontract.ai](https://swisscontract.ai) — a contract analyser that runs on Swiss servers and uses Swiss AI. The pitch: your employment contract text never leaves Switzerland. This week I actually delivered on that promise. It took two days, three infrastructure switches, and a surprising number of npm bugs. Here's the full story.

## The Goal: Swiss-Sovereign AI

The app was running on Vercel with Claude. Great for quality, but "Swiss-sovereign" means data stays in Switzerland. Infomaniak — a Geneva-based cloud provider — offers an AI API backed by open models in their Swiss datacenters. I wanted to test the models and swap the hosting at the same time.

## Testing the Models

I tested 5 Infomaniak AI models against a real Swiss employment contract:

| Model | Time | Valid JSON | Accuracy |
|-------|------|-----------|----------|
| qwen3 | 23.9s | ✅ | Good |
| moonshotai/Kimi-K2.5 | 26.1s | ✅ | **Best** |
| llama3 | 15.7s | ✅ | Decent |
| mistral3 | 8.2s | ❌ (markdown) | Good |
| swiss-ai/Apertus-70B | 26.5s | ❌ (markdown) | Good |

**Key finding**: Infomaniak's v2 API doesn't support `response_format: { type: "json_object" }` — only `json_schema`. You have to prompt-engineer your way to JSON and then repair whatever comes back.

**Production choice**: Apertus 70B — a Swiss-AI model developed by EPFL and the Swiss AI Initiative, hosted on Infomaniak's Swiss infrastructure. The JSON output needed the most fixing, but the quality on Swiss employment contracts was good enough to ship. Qwen3 and Kimi-K2.5 stay available as fallbacks.

## The JSON Repair Rabbit Hole

Open models are worse than Claude at producing valid JSON on demand. Across 4 commits, I built an `extractJSON()` pipeline that handles every failure mode I hit:

```typescript
function extractJSON(text: string): string {
  // 1. Strip <think>...</think> (Qwen3 outputs its reasoning first)
  text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim()

  // 2. Extract from ```json ``` fences if present
  const fenceMatch = text.match(/```json\s*([\s\S]*?)```/)
  if (fenceMatch) text = fenceMatch[1]
  else {
    // 3. Extract outermost {...} object
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start !== -1 && end !== -1) text = text.slice(start, end + 1)
  }

  // 4. Strip control chars
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  // 5. Fix trailing commas
  text = text.replace(/,(\s*[}\]])/g, '$1')

  // 6. Unwrap nested arrays [[{...}]] → [{...}]
  text = text.replace(/^\[\[/, '[').replace(/\]\]$/, ']')

  // 7. Repair truncated JSON (close unclosed {, [, ")
  return repairTruncatedJSON(text)
}
```

The `repairTruncatedJSON` function was the hardest part — it tracks open brackets and quotes with a stack and closes them at the end of the string. Needed because real contracts are long and models hit their token limits mid-JSON.

Apertus 70B kept failing on very long inputs even with 8192 output tokens. A quick fix was to cap input at 8,000 characters — that kept the model in its reliable range while we worked on the parser.

Once the full repair pipeline was solid and `jsonrepair` was in as a safety net, we reversed the cap. Full contract text goes in. The right fix was always the parser, not truncating input.

## Hosting: Jelastic → VPS → Docker + Traefik

I wanted to keep everything on Infomaniak. They offer Jelastic Cloud — a PaaS with container environments. In theory: perfect.

### What Went Wrong with Jelastic

**SSH key registration is UI-only.** The API has endpoints for it that return 404. After wasting time on this I switched to their exec API — shell commands as HTTP requests.

**The exec API times out under load.** Running `npm ci` via the exec API would return before npm finished. The process kept going but the API declared success. Stale builds.

After getting it working once, a slow deployment would corrupt the build and the only fix was to re-trigger. Not acceptable for CI/CD.

### Plain VPS — First Attempt (pm2 + nginx)

Infomaniak VPS Cloud S: Ubuntu 24.04, plain SSH. I set up:

```
nginx → Next.js (pm2)
```

Simple. But two nasty bugs on the way.

**npm cache corruption.** The first deploy completed but `node_modules` was 532KB instead of 563MB. `npm ci` exited 0 but half the packages were missing. Root cause: corrupted npm cache, hundreds of `TAR_ENTRY_ERROR ENOENT`.

Fix: `npm cache clean --force && npm install --prefer-online`

**SSH heredoc + npm don't mix.** My GitHub Actions workflow used:

```yaml
ssh user@host << 'REMOTE'
  npm ci && npm run build
REMOTE
```

npm would not complete inside a heredoc. Exit 0, no output. The TTY situation with heredoc SSH confuses npm's progress tracking.

Fix: write a deploy script to the server and call it directly:

```yaml
scp deploy.sh user@host:/app/deploy.sh
ssh user@host "bash /app/deploy.sh"
```

Obvious in hindsight.

### Next.js 16 Migration (Surprise)

Next.js 16.1.6 deprecates `middleware.ts`. You now need `proxy.ts` with a renamed export:

```typescript
// Before (middleware.ts)
export function middleware(request: NextRequest) { ... }

// After (proxy.ts)
export function proxy(request: NextRequest) { ... }
```

Both files can't coexist — delete `middleware.ts` first. Also: `experimental.turbo` in `next.config.ts` is gone entirely.

## The Architecture We Actually Shipped

After accumulating nginx + certbot + pm2 + permission hooks, I scrapped it all and rebuilt with Docker + Traefik. This is what's running in production now:

```
VPS:
  Traefik (Docker) ← SSL, routing, service discovery
  swisscontract-preprod (Docker) ← preprod.swisscontract.ai
  swisscontract-production (Docker) ← swisscontract.ai
```

Each branch has its own GitHub Actions workflow that builds one Docker image and deploys one container. Traefik discovers it via Docker labels and handles SSL via Let's Encrypt ACME automatically. Certs live in a Docker volume — no certbot, no cron, no renewal hooks.

```yaml
# ~/traefik/docker-compose.yml — on VPS, not in repo
services:
  traefik:
    image: traefik:latest
    command:
      - --certificatesresolvers.letsencrypt.acme.email=...
      - --providers.docker=true
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - traefik-certs:/letsencrypt
```

App containers declare themselves via Docker labels in the GitHub Actions workflow:

```bash
docker run -d \
  --name swisscontract-production \
  --network traefik-net \
  --label traefik.enable=true \
  --label "traefik.http.routers.prod.rule=Host(\`swisscontract.ai\`)" \
  --label traefik.http.routers.prod.tls.certresolver=letsencrypt \
  ...
```

One gotcha: `traefik:v3` was incompatible with Docker Engine 29 — had to use `traefik:latest` (which is v3.4.1+) and set `DOCKER_API_VERSION=1.45`.

Adding a new environment = new branch + new workflow, zero server changes. That's the right abstraction.

## Shipping Production

On March 6 at 19:52 CET, `swisscontract.ai` went live on Swiss infrastructure:

- DNS cut in Cloudflare: A record `swisscontract.ai` → Infomaniak VPS (previously pointed at Vercel)
- GitHub Actions `deploy.yml` ran on `main` → built `:production` image → deployed
- `https://swisscontract.ai` → HTTP 200, `env: "production"`, SSL via Traefik

Tagged as `v0.2.0`. `v0.1.0` snapshots the Vercel/Anthropic era.

Before cutting DNS, we stripped out a few things that didn't belong in a privacy-first app:

**Google Analytics removed.** GA4 sends data to US servers. That contradicts the Swiss-sovereign pitch. Removed entirely.

**Fully stateless.** No cookies, no localStorage, no session storage — nothing written to the browser at all. You upload a contract, get an analysis, close the tab. Nothing persists anywhere. No consent banner needed because there's nothing to consent to.

**nFADP/compliance claims removed** from README and product copy. Making legal promises we can't back requires a lawyer, not a README section.

Other cleanup:
- CORS in nginx restricted to `*.swisscontract.ai` (was reflecting any origin)
- HSTS + security headers added
- VPS IP scrubbed from PR body and release notes
- Old Jelastic secrets deleted from GitHub environments
- `.env.production` deleted (it had `NEXT_PUBLIC_ENV=preprod` in it — classic)

## What I'd Do Differently

1. **Skip Jelastic for small Node.js apps.** A plain VPS with Docker is simpler and more reliable.

2. **Test AI model JSON output on day one.** Don't assume a new provider's API behaves like OpenAI's.

3. **Build the full JSON repair pipeline once.** Don't add one fix at a time as models fail. Handle control chars, trailing commas, nested arrays, and truncation in one pass.

4. **Traefik from the start.** nginx + certbot accumulates into a mess. Traefik + Docker labels is the right model for multi-environment deploys from the beginning.

## Current Status

- `https://swisscontract.ai` — production, live, Swiss infrastructure, Traefik SSL ✅
- `https://preprod.swisscontract.ai` — preprod, same VPS, separate container ✅
- GitHub Actions auto-deploys on push to `main` and `preprod`
- Contract analysis running on **Apertus 70B** (Swiss-AI / EPFL model, Infomaniak Swiss datacenter)
- Fully stateless — no cookies, no localStorage, nothing written to the browser
- Qwen3 and Kimi-K2.5 available as provider alternatives

The sovereignty promise is delivered: your contract text stays in Switzerland, analysed by a Swiss model, on Swiss servers. Nothing leaves.