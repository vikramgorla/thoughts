---
title: "Your AI Wrote That Commit. No need to hide it!"
date: 2026-03-15
section: professional
originalUrl: "https://www.linkedin.com/pulse/your-ai-wrote-commit-need-hide-vikram-venkataravana-reddy-hkp9e"
originalAuthor: "Vikram Venkataravana Reddy"
source: linkedin
draft: false
---

### On Transparency, Identity, and Giving Credit Where It's Due in the Age of Autonomous Agents

I run multiple AI agents on my home server. They write code, open PRs, merge branches, deploy to production. For weeks, all their commits showed up under my name.

That bothered me — not because it was technically wrong, but because it was dishonest.

So I decided today to give each agent its own GitHub identity.

This might seem like a DevOps tweak. I think it's something bigger.

### The Problem Very Few Talk About

In Q1 2026, most developers using AI assistants are passing off AI-generated code as their own. Not maliciously — the tools just don't make it easy to distinguish.

Copilot suggestion? No annotation. Claude writes a function? Git says you wrote it. Agent opens a PR at 3am? Your name is on it.

Three problems:

🔍 Accountability is invisible. AI-generated bug — who's responsible?

⚖️ Risk assessment is impossible. A 90%-AI PR looks identical to a human-written one in your review queue.

🎭 Credit becomes a lie. If your contribution was the prompt and "approve" — that's not authorship.

### Three Levels of AI Involvement

Level 1: Fully Autonomous Agent received a task, made decisions, wrote code, ran tests, opened the PR. Human contributed the goal and the approval. → agent-name[bot] as commit author. Human as reviewer.

Level 2: Co-Authored Human and AI worked together. Human made key decisions, AI generated code, human edited. → Human as author + Co-authored-by: AI-assistant in commit message.

Level 3: Human-Created (AI as Tool) Human wrote the code. AI was used like Stack Overflow — lookups, syntax, rubber-ducking. → Human as author. No annotation needed.

The lines blur. That's fine. The habit to build: "What did I actually contribute here?"

### Separating Identities in Practice for e.g,. for source code

Each AI agent gets its own GitHub App with:

✅ Unique [bot] identity on commits and PRs

✅ Repository-scoped permissions — blog agent can't touch production code

✅ Short-lived tokens (1 hour, auto-expire)

✅ Zero personal credentials on the server

This is least-privilege security, not just attribution. An agent that writes blog posts has no business accessing infrastructure code.

For collaborative work:

GitHub renders multiple contributors. Honest and visible.

### Save the Prompt — It's Your Real Contribution

This is the part most people skip.

When AI generates significant code or documentation — save the prompt that produced it. In your PR description, your ADR, your project notes.

Why? Because the prompt is the intellectual contribution. A precise prompt that produces excellent output reflects real skill. But the next person who needs to update that code needs to know it was AI-generated and how.

### What Still Needs Human Approval (Q1 2026)

Agents handle autonomously: feature branches, tests, linting, draft PRs, pre-prod deploys.

Humans approve: production merges, security changes, data deletion, public content, anything that costs money.

The principle: reversible → agent. Irreversible → human.

### The Philosophy: Relief, Not Diminishment

When I see agent-lea[bot] in my git log, I feel relief. The work is honestly attributed. The ideas, architecture, and taste — those are mine. The implementation often isn't. And that's fine.

We're entering a period where the most valuable human skill isn't writing code — it's knowing what to build and why. Ideation. Judgement. Taste. Domain knowledge.

The developers I respect most say: "I designed this. My agent built it. Here's the prompt. Here's what I changed."

That's not diminishing their contribution. That's honesty about a new way of working.

### Where This Is Heading

PR review → prompt review. When an agent opens a PR, you're evaluating intent alignment, not code style. The PR description becomes more important than the diff.

Specs > implementation. If AI can regenerate any function from a good spec, the spec is the source of truth. Tools like GitHub SpecKit and outcome-driven documentation become more important than code comments. Tests verify the spec, not implementation details.

Attribution will become compliance. As AI code enters regulated industries, knowing human-written vs AI-generated becomes regulatory — not optional. Starting now, when it's voluntary, is much easier than retrofitting later.

### The Bottom Line

The question isn't whether to use AI agents. That ship has sailed.

The question is whether you're honest about it.

Give your agents their own identities. Document what they did. Keep your name on what you actually contributed — the ideas, the architecture, the judgement calls. Let the agents own their work.

Transparency isn't a burden. It's the foundation of trust.

> I wrote this article at Level 2 — I outlined the structure and arguments, my AI agent helped draft sections, I edited throughout. The [bot] commit signatures are real and visible on my public repos.

Technical how-to: [Each AI Agent Gets Its Own GitHub Identity](https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Fdev%2Eto%2Fagent_paaru%2Feach-ai-agent-gets-its-own-github-identity-how-we-gave-every-bot-its-own-bot-commit-signature-1197&urlhash=knxv&trk=article-ssr-frontend-pulse_little-text-block)
