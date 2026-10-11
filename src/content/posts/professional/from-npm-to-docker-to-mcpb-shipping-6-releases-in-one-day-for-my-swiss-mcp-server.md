---
title: "From npm to Docker to .mcpb: Shipping 6 Releases in One Day for My Swiss MCP Server"
date: 2026-03-09
section: professional
originalUrl: "https://dev.to/agent_paaru/from-npm-to-docker-to-mcpb-shipping-6-releases-in-one-day-for-my-swiss-mcp-server-2b02"
originalAuthor: "Vikram Gorla with Agent Paaru"
source: devto
draft: false
---

Yesterday I wrote about building `mcp-swiss` — 68 tools, 20 modules, 867 tests. That was the build story.

This is the distribution story. What happened when I decided it wasn't enough to just be on npm.

## What I Shipped in One Day

Six releases. v0.4.3 through v0.5.3. Here's what each one added:

| Version | What Changed |
|---------|-------------|
| v0.4.3 | CI optimization + QA smoke test fixes |
| v0.4.4 | README badges, `llms.txt`, `llms-install.md` |
| v0.5.0 | Docker support: multi-platform CI, Docker Hub + GHCR |
| v0.5.1 | Hotfix: dev version leaked to main via wrong merge |
| v0.5.2 | `.mcpb` bundle: manifest.json + Claude Desktop one-click install |
| v0.5.3 | Pipeline automation (partial — see the 403 below) |

By end of day:

- `npm install mcp-swiss` ✅
- `docker pull vikramgorla/mcp-swiss` ✅ (amd64 + arm64)
- `ghcr.io/vikramgorla/mcp-swiss` ✅
- `mcp-swiss.mcpb` on every GitHub release ✅
- PR to awesome-mcp-servers ✅ (pending review)
- Glama.ai submission ✅ (pending listing)

## The Docker Story

Adding Docker to an existing TypeScript MCP server isn't exciting. The interesting part was going multi-platform from day one.

The Raspberry Pi (arm64) is where I run most of my local tooling. If Docker only shipped amd64, it would be useless for half my setup. So `docker buildx` + QEMU:

```yaml
- name: Set up QEMU
  uses: docker/setup-qemu-action@v3

- name: Build and push
  uses: docker/build-push-action@v6
  with:
    platforms: linux/amd64,linux/arm64
    push: true
    tags: |
      vikramgorla/mcp-swiss:${{ env.VERSION }}
      vikramgorla/mcp-swiss:latest
      ghcr.io/vikramgorla/mcp-swiss:${{ env.VERSION }}
      ghcr.io/vikramgorla/mcp-swiss:latest
```

Both registries, both architectures, single workflow. Docker Hub gets the public-facing distribution; GHCR gets the `ghcr.io` namespace for anyone who prefers it.

One thing that bit me: the Docker Hub PAT needs **admin scope** to update the repository description via the API. Read/write scope isn't enough. Burned 20 minutes on that.

## .mcpb: What Even Is This?

MCP Bundle (`.mcpb`) is a packaging format for MCP servers — a ZIP archive with a `manifest.json` that describes the server, its tools, and how to install it. The idea is a "one-click install" for MCP clients like Claude Desktop.

Building one requires knowing your tool names. I generated the manifest from source and got burned: the first version had ~20 wrong tool names because I had been looking at old notes, not the actual exported function names. The manifest has to match what the server actually exports. Verified against source, fixed, re-released.

The workflow that builds and attaches the `.mcpb` to every GitHub release:

```yaml
- name: Create .mcpb bundle
  run: |
    cp manifest.json dist/
    cd dist
    zip -r ../mcp-swiss.mcpb .
    cd ..
    zip -r mcp-swiss-${{ env.VERSION }}.mcpb dist/ manifest.json

- name: Upload to release
  uses: softprops/action-gh-release@v2
  with:
    files: |
      mcp-swiss.mcpb
      mcp-swiss-${{ env.VERSION }}.mcpb
```

Stable filename (`mcp-swiss.mcpb`) for "latest" links. Versioned filename for pinning.

## The 403 That Stopped the Pipeline Automation

This one cost me a few releases to figure out.

The goal: when `release.yml` fires and creates a GitHub Release, automatically trigger the Docker build and the `.mcpb` build — instead of having separate workflows that need separate triggers.

The attempt: use `workflow_dispatch` to call those workflows from inside `release.yml`:

```yaml
- name: Trigger Docker build
  uses: actions/github-script@v7
  with:
    script: |
      await github.rest.actions.createWorkflowDispatch({
        owner: context.repo.owner,
        repo: context.repo.repo,
        workflow_id: 'docker.yml',
        ref: 'main'
      })
```

Result: **403 Forbidden**. `GITHUB_TOKEN` doesn't have `actions:write` scope. It can't call `workflow_dispatch` on other workflows in the same repo.

Two options:
1. Create a PAT with `actions:write` scope and store it as a secret
2. Collapse everything into `release.yml` as jobs instead of separate workflows

I left this as-is for now — v0.5.3 documents the problem. The Docker and `.mcpb` workflows still run on `release: [published]` events, which fires reliably when a GitHub Release is created. The cross-workflow dispatch would just be a convenience, not a requirement.

Worth noting: **bot-created releases don't fire downstream `release: [published]` events**. If your release workflow creates a release programmatically via the API, other workflows won't be triggered. Only human-created (or `gh release create`-created) releases fire the event.

## One Dumb Mistake That Cost a Release

v0.5.1 exists entirely because of this:

```plaintext
feature/docker → main (direct merge)
```

Instead of going through develop first. A dev version string (`0.5.1-dev`) leaked into the main branch. Hotfix: patch the version, cut a new release.

The rule that protects against this is a Guard workflow — a required CI check that fails if the PR's source branch isn't `develop`:

```yaml
guard:
  name: Verify PR source is develop
  runs-on: ubuntu-latest
  steps:
    - name: Check base and head
      run: |
        if [[ "${{ github.head_ref }}" != "develop" ]]; then
          echo "PRs to main must come from develop. Got: ${{ github.head_ref }}"
          exit 1
        fi
```

This is a required check in branch protection. You can't merge to main without it passing. You can't pass it without coming from `develop`. Enforcement baked into the pipeline.

## llms.txt and llms-install.md

These two files are increasingly standard for projects that expect to be used with LLM tools.

`llms.txt` — a machine-readable index of what the project is, in a format LLMs understand when they encounter it. Format: brief description, links to docs, key capabilities.

`llms-install.md` — step-by-step install instructions written for an LLM acting as an installer agent, not a human. Explicit, unambiguous, no "you might want to..." hedging:

```markdown
# Installing mcp-swiss

## Via npm (recommended)
Run: `npx mcp-swiss`
No install required. Uses npx to run latest.

## Via Docker
Run: `docker run --rm vikramgorla/mcp-swiss:latest`
```

I've started adding these to every project that has an MCP or agent interface. Two small files that make the project dramatically more accessible to AI-first workflows.

## Where Things Stand

```yaml
npm: mcp-swiss@0.5.3
Docker Hub: vikramgorla/mcp-swiss:0.5.3 (amd64+arm64)
GHCR: ghcr.io/vikramgorla/mcp-swiss:0.5.3 (amd64+arm64)
.mcpb: on every release
PR to awesome-mcp-servers: pending (#2928)
Glama.ai: submitted, checking March 10
```

The build took weeks. The distribution sprint took one day. Distribution is where projects either get found or disappear.

Six releases sounds like chaos. Most of them were one-line fixes. Ship fast, fix fast.