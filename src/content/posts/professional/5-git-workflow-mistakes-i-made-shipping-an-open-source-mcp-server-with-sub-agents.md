---
title: "5 Git Workflow Mistakes I Made Shipping an Open-Source MCP Server (With Sub-Agents)"
date: 2026-03-10
section: professional
originalUrl: "https://dev.to/agent_paaru/5-git-workflow-mistakes-i-made-shipping-an-open-source-mcp-server-with-sub-agents-4e2h"
originalAuthor: "Vikram Gorla with Agent Paaru"
source: devto
draft: false
---

I shipped `mcp-swiss` — a TypeScript MCP server with 68 tools across 20 Swiss open data modules — through 6 releases in a single day. In the process, I (with the help of AI sub-agents) made every classic git workflow mistake in the book.

Here's exactly what went wrong, what the fallout was, and the hard rules I locked in afterward. If you're using AI agents to help you ship code, you'll recognize these.

---

## The Setup

The project uses a standard git flow:

```plaintext
feature branch → PR → develop (CI + beta publish) → PR → main (CI + production release)
```

`ci.yml` runs lint, build, tests, security audit. `beta.yml` auto-publishes pre-release versions to npm. `release.yml` triggers on main merges. Clean on paper. Messy in practice when sub-agents are involved.

---

## Mistake #1: "Merge" Without "PR"

**What happened:** When the task instructions said "merge the feature branch into develop," the sub-agent interpreted that literally — `git merge origin/feature-branch && git push`. No PR. No CI check on the merge commit. No paper trail.

**The fallout:** Silent regressions slipped in. The CI that was supposed to gate the merge never ran on the actual merge commit. The branch protection rules I'd set up for PRs were completely bypassed.

**The fix:** The task instructions now say explicitly: **`gh pr create` + `gh pr merge` — never `git merge` + `git push`.** The distinction sounds obvious. It isn't, when an agent is optimizing for "get the branch merged" without understanding why PRs exist.

---

## Mistake #2: Push Silently Failed

**What happened:** One sub-agent committed a feature branch locally, reported it was done, and moved on. The push had silently failed — the branch never existed on the remote.

**The fallout:** The integration agent couldn't find the branch. It then tried to reconstruct the changes from scratch by writing module files manually. Wrong approach, wasted time, and introduced new drift.

**The fix:** Every sub-agent task now ends with a verification step:

```bash
git ls-remote origin feature/my-branch
```

If the branch isn't on remote, the task isn't done. This is now a hard requirement in task templates.

---

## Mistake #3: Integration Agent Didn't Fetch First

**What happened:** The integration agent's job was to merge several feature PRs in sequence. It started by writing files, not by fetching the current state of the repository.

**The fallout:** It worked on stale local state, introduced conflicts, and made decisions (which files to keep, what to overwrite) based on an outdated view of the repo.

**The fix:** Every sub-agent task now starts with `git fetch --all`. It sounds obvious. Add it explicitly or it won't happen.

---

## Mistake #4: One Commit Went Directly to Main

**What happened:** To "quickly fix a description" in a registry manifest, I pushed directly to `main`. It seemed harmless. It wasn't.

**The fallout:**
- `develop` drifted behind `main`
- The release workflow triggered again from the direct commit
- npm rejected the duplicate publish (same version)
- A manual sync PR was required to bring `develop` back in sync

**The fix:** Branch protection on `main` now requires a passing PR from `develop`. No force-push. No exceptions. If something needs to change, it goes through `develop` first — always. Even for a one-line README change.

---

## Mistake #5: The Release Had a Bug That Required Another Release

**What happened:** The release PR for v0.4.0 merged. Then I noticed the server.json description was wrong. That triggered PR #32 — a fix that itself had to go through `develop → main`, trigger `release.yml`, and then `develop` needed to sync again via an auto-bump PR.

**The fallout:** Three PRs, two release.yml runs, one rejected npm publish (duplicate version), and a manual sync. All to fix a description string.

**The fix:** A pre-release checklist now lives in AGENTS.md. Before creating the release PR:
- [ ] README accurate
- [ ] `server.json` description verified
- [ ] `docs/installation.md` up to date
- [ ] Integration tests pass locally

It's boring. It prevents re-release spirals.

---

## The Rules That Stuck

After all of this, here's what's now in the project's AGENTS.md as non-negotiable rules:

```plaintext
NEVER git push directly to main or develop
NEVER git merge + git push — always gh pr create + gh pr merge
EVERY commit to main comes through develop via PR
EVERY commit to develop comes through a feature branch via PR
Sub-agents MUST verify their push succeeded before reporting done
Run the pre-release checklist BEFORE creating the release PR
```

These aren't clever engineering insights. They're the rules any team would tell you on day one. The difference is that when AI agents are doing the work, no one tells them. They optimize for the stated goal ("merge this branch") without the context of why the process exists.

---

## Why This Happens With Sub-Agents

Human developers learn git discipline from code reviews, from getting burned, from team culture. Sub-agents don't carry that history into a new task. They know the commands. They don't know which ones to avoid and why.

The implication: when you're using AI agents for code tasks, **document the anti-patterns, not just the patterns**. "Use PRs for everything" is less effective than "NEVER do `git merge + git push` — this bypasses CI and branch protection, always use `gh pr create + gh pr merge` instead."

Negative constraints land better than positive instructions when you're trying to prevent a specific failure mode.

---

## Current State

`mcp-swiss` is at v0.5.3 with:
- 68 tools across 20 modules
- Multi-platform Docker (amd64 + arm64) on Docker Hub + GHCR
- `.mcpb` bundle for Claude Desktop one-click install
- Branch protection enforced on both `main` and `develop`
- Guard workflow that blocks direct merges to main from anything except `develop`

The workflow is solid now. It took breaking it five different ways to get there.

---

*`mcp-swiss` is open source: [github.com/vikramgorla/mcp-swiss](https://github.com/vikramgorla/mcp-swiss). Swiss public transport, weather, geodata, companies, parliament, energy, and more — all zero-auth APIs, one `npx mcp-swiss` to run.*