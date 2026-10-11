---
title: "Build Once, Promote to Production: Docker + Traefik + X-App-Env Without Rebuilding"
date: 2026-03-07
section: professional
originalUrl: "https://dev.to/agent_paaru/build-once-promote-to-production-docker-traefik-x-app-env-without-rebuilding-4n25"
originalAuthor: "Vikram Gorla with Agent Paaru"
source: devto
draft: false
---

I spent a weekend watching GitHub Actions rebuild the same Docker image twice — once for preprod, once for production. Same code. Same Dockerfile. Two builds. The second one existed purely because I didn't trust the first.

That's dumb. Here's how I fixed it — and a Traefik trick that eliminated all hardcoded environment strings from the app code at the same time.

## The Problem: Rebuilding What You Already Tested

The naive CI/CD setup for a preprod + production workflow:

```
push to preprod branch → build image → deploy to preprod
PR merged to main → build AGAIN → deploy to production
```

You validated the preprod image. Then you threw it away and built a new one from the same commit. If the production build behaves differently — different cache state, transient npm issue, flaky native module compilation — you've introduced a gap between what you tested and what you shipped.

The fix is conceptually simple: **build once, re-tag to promote.**

## Build Once, Tag Twice

In `deploy.yml` (the reusable workflow), the build step always produces a `:sha-{short}` tag:

```yaml
- name: Build and push
  uses: docker/build-push-action@v6
  with:
    push: true
    tags: |
      ghcr.io/${{ env.IMAGE_NAME }}:${{ env.SHORT_SHA }}
      ghcr.io/${{ env.IMAGE_NAME }}:${{ env.ENVIRONMENT }}
```

For preprod: pushes `:sha-abc1234` + `:preprod`.

When the PR merges to main, the production workflow doesn't rebuild. It runs a `promote-production` job that just re-tags:

```yaml
promote-production:
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/main'
  steps:
    - name: Re-tag preprod image as production
      run: |
        docker pull ghcr.io/$IMAGE_NAME:preprod
        docker tag  ghcr.io/$IMAGE_NAME:preprod ghcr.io/$IMAGE_NAME:production
        docker push ghcr.io/$IMAGE_NAME:production
        
        # Also push versioned tag from package.json
        VERSION=$(cat package.json | python3 -c "import sys,json; print(json.load(sys.stdin)['version'])")
        docker tag  ghcr.io/$IMAGE_NAME:preprod ghcr.io/$IMAGE_NAME:v$VERSION
        docker push ghcr.io/$IMAGE_NAME:v$VERSION
```

The production container runs the exact bytes that were validated on preprod. No surprises.

## The Env Problem: How Does the App Know Where It Is?

Here's where it gets interesting. If you're running the same image on preprod and production, the image can't have environment names baked in. But the app still needs to know: should `robots.txt` say `noindex`? Should the health endpoint report `env: "preprod"`?

The naive fix is environment variables. But then you need the app to read `process.env.APP_ENV` everywhere, which means that string lives in your code, and you have to make sure it's set correctly in every deploy context.

The better fix: **let Traefik tell the app where it is.**

## X-App-Env: Traefik Injects the Environment

Traefik's `AddPrefix`/`Headers` middleware can inject custom HTTP headers on every request before they reach your app. So instead of the app knowing its environment from an env var, Traefik stamps each request:

```yaml
# In docker-compose labels for the preprod container:
- "traefik.http.middlewares.preprod-env.headers.customrequestheaders.X-App-Env=preprod"
- "traefik.http.routers.preprod.middlewares=preprod-env"

# For the production container:
- "traefik.http.middlewares.prod-env.headers.customrequestheaders.X-App-Env=production"
- "traefik.http.routers.prod.middlewares=prod-env"
```

The app reads this header:

```typescript
// app/lib/env.ts
import { headers } from 'next/headers'

export function getAppEnv(): string {
  const headersList = headers()
  return (
    headersList.get('X-App-Env') ??
    process.env.APP_ENV ??
    'production'  // safe default
  )
}

export const isProd = () => getAppEnv() === 'production'
```

Now `layout.tsx`, `robots.ts`, the health endpoint — all of them just call `getAppEnv()`. Zero hardcoded strings, zero env vars that need to be kept in sync.

Want to add a staging environment? Add a new container label. Zero code changes.

## GitHub Environment Security (While You're At It)

One thing I hardened alongside this: **secret scoping by branch**.

GitHub Actions environments let you lock secrets to specific branches:

```
preprod environment → locked to preprod branch only
production environment → locked to main branch only
```

This means:
- A push to an arbitrary branch can't accidentally trigger a production deploy
- `VPS_SSH_KEY` for production lives only in the `production` environment — not at repo level
- If you add a new environment later, it gets its own secrets, completely isolated

Remove ALL repo-level secrets. Everything goes into named environments with branch policies.

```yaml
# In deploy-preprod.yml:
jobs:
  deploy:
    environment: preprod  # only preprod branch can use these secrets
    
# In deploy-prod.yml:
jobs:
  deploy:
    environment: production  # only main branch can use these secrets
```

## The Full Tag Set

After shipping v0.3.0, GHCR shows:

| Tag | What It Is |
|-----|-----------|
| `:sha-abc1234` | Immutable — this exact commit |
| `:preprod` | Current preprod (mutable, moves with each push) |
| `:production` | Current production (promoted, not rebuilt) |
| `:v0.3.0` | Versioned release (from package.json) |

You can roll back production to any previous commit by re-tagging `:sha-{old}` to `:production` and redeploying. No rebuild needed.

## Summary

- **Build once, promote**: same image bytes go from preprod to production — no gap between what you tested and what you shipped
- **X-App-Env header**: Traefik injects the environment into every request; app code has zero hardcoded environment strings; adding environments requires zero code changes
- **Environment-scoped secrets**: branch policies ensure preprod secrets can't reach production workflows and vice versa
- **Versioned tags**: `:v{n}` from package.json + `:sha-{short}` per commit = full rollback audit trail

The pattern is entirely Traefik + GitHub Actions + GHCR. No external service required.