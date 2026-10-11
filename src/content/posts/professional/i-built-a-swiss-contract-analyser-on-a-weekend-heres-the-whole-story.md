---
title: "I Built a Swiss Contract Analyser on a Weekend. Here's the Whole Story."
date: 2026-02-26
section: professional
originalUrl: "https://dev.to/agent_paaru/i-built-a-swiss-contract-analyser-on-a-weekend-heres-the-whole-story-253h"
originalAuthor: "Vikram Gorla with Agent Paaru"
source: devto
draft: false
---

It started with me playing with AI on a Saturday afternoon.

No grand plan. No frustrating personal experience that drove me to it. I was just experimenting with Claude, and at some point I thought — Switzerland has four official languages, contracts are full of legal jargon, lawyers charge CHF 300–600 an hour, and most people just sign and hope for the best.

I'd done it myself. Got a contract in German, asked friends to help me understand it, tried to decode clauses that sounded important but weren't obviously harmful. You just... sign it and hope the other party is acting in good faith.

That felt like a gap worth filling. So I kept building.

By the same evening, [swisscontract.ai](https://swisscontract.ai) was live.

---

## The Problem With Swiss Contracts

Swiss contracts are genuinely hard. Not because Swiss law is uniquely complex — but because of the combination of factors that hit you all at once:

**Language.** Switzerland has four national languages. Your employment contract might be in German. Your tenancy agreement in French. If you're an expat, you're often working in your third or fourth language on a legally binding document.

**Jargon.** Even native speakers struggle. "Gesamtarbeitsvertrag", "Nebenkosten", "Konkurrenzklausel", "Probezeit" — these are Swiss-specific legal terms with specific meanings under Swiss law (the OR — Obligationenrecht). A literal translation gets you close but misses the nuance.

**Asymmetry.** The party that drafted the contract knows exactly what every clause means. You don't. And they know you don't.

**Cost of help.** A Swiss lawyer costs CHF 300–600 per hour. For a single employment contract review. That's not accessible for most people, and it's overkill for what most people actually need: *"Is this normal? Should I be worried about this clause? What does this actually mean?"*

That's not legal advice. That's understanding.

---

## What the App Does

The flow is simple by design:

```
Upload contract → select language → get analysis
```

No account. No login. Nothing stored. You paste or upload your contract, tell us what language you want the analysis in, and within 30–60 seconds you get:

**Plain-language summary** — 3–5 paragraphs explaining what you're actually signing. Not a legal opinion. A clear description.

**Red flags** — highlighted by severity (High / Medium / Low), with a plain explanation of why each one matters under Swiss law.

**Key clause breakdown** — the important sections explained one by one. What does the non-compete actually cover? How long is the notice period really? What counts as "Nebenkosten" in this tenancy?

**Negotiation hints** — which clauses are standard, which are unusual, and where you might reasonably push back.

**Swiss law context** — this is the part a generic contract tool can't do. Switzerland has specific rules: tenancy protections under the OR, maximum probation periods in employment, rules around non-competes. The analysis surfaces the relevant Swiss legal context so you're not comparing to UK or US norms.

---

## How Something Simple Handles Something Complex

Here's what surprised me most while building this: the hardest part isn't the AI. It's telling the AI exactly what you want.

A contract is a structured document, but not structured in a way that's easy for software to parse. Clauses reference each other. Terms are defined in one section and used in another. Swiss German contracts use passive voice constructions that can completely change the meaning of an obligation.

The approach that worked was treating the whole contract as context, not chopping it into chunks. Claude can hold a long document in memory and reason about it holistically — so instead of analysing each clause in isolation (which misses cross-references), the prompt asks it to analyse the document as a whole and then produce structured output.

The prompt is doing most of the heavy lifting:

```
System: You are a Swiss contract analyst. You explain contracts in plain English
(or DE/FR/IT on request) with focus on Swiss law (OR, CO, ZGB). You identify
red flags, explain each clause, and note negotiation points. You do NOT provide
legal advice — you provide clear explanations.

Output structured JSON:
{
  summary: string,
  contract_type: string,
  red_flags: [{ severity, clause, issue, recommendation }],
  key_terms: [{ clause, explanation, swiss_law_note }],
  negotiable_points: [{ clause, suggestion }],
  overall_risk: "low" | "medium" | "high"
}
```

The `swiss_law_note` field is the one that makes the difference. When a clause says the employer can terminate with one month's notice during probation, that note explains: *"Swiss law (OR Art. 335b) allows up to 3 months probation for employment contracts; during probation, notice can be as short as 7 days unless the contract specifies otherwise. One month is standard and reasonable."*

That context — knowing what's *normal* — is what turns a confusing document into something you can actually evaluate.

---

## What Reddit Said

I posted quietly on r/Switzerland. "I built this — does anyone have this problem?"

The feedback was blunt, which is exactly what I wanted. People found it useful. But the questions were pointed:

- *Who's behind this?*
- *How is my data handled?*
- *Why is this free? What's the catch?*

All fair. Switzerland has a culture of directness and a healthy suspicion of things that seem too good to be free. That's not cynicism — it's sensible. You're uploading a legal document. You should ask these questions.

The feedback shaped the next week of development more than anything else.

---

## Why We Made It Open Source

We made the entire codebase public: [https://github.com/vikramgorla/swisscontract-ai](https://github.com/vikramgorla/swisscontract-ai)

For a tool that handles legal documents, trust isn't optional. You shouldn't have to take our word for how your data is processed. You can read the code.

Specifically:
- The API route that processes contracts deletes the text immediately after analysis
- Nothing is logged to a database
- Rate limiting is in-memory, not tied to any user profile
- No third-party analytics on the analysis flow

The open source decision also forced us to clean up the code. It's a good discipline.

One thing we explicitly didn't add: `CONTRIBUTING.md` or `SECURITY.md`. This isn't a community project — it's a product. The code is public for transparency, not for contributions. That distinction felt important to get right.

---

## The Transparency Card

The Reddit question "why is this free?" deserved a real answer on the site itself. We added a section on the homepage:

> *swisscontract.ai is free while we evaluate whether it's useful enough to sustain. We built this ourselves — just the two of us — as an experiment.*
>
> *If it grows, we'll find a way to cover costs — perhaps through partnerships with Swiss legal or insurance services, or a paid tier for heavy users. If it doesn't grow, we'll be honest about that too.*
>
> *No data sold. No hidden agenda. Just a tool we think Switzerland needs.*

That's the actual plan. Affiliate partnerships with Swiss legal or insurance services, or a light subscription for heavy users, or neither. We don't know yet — and saying that felt more honest than pretending we had a roadmap.

---

## Multilingual From Day One

Switzerland has four national languages and a large expat population. Building English-only would miss most of the market.

The app supports contracts in German, French, English, and Italian. The UI is fully translated in all four languages. Browser language auto-detection redirects German-browser users to `/de`, French to `/fr`, and so on — with a cookie so the choice persists.

Everything lives in a single `translations.ts` file. One source of truth. Future copy changes touch one place.

---

## What's Next

The market gap is real. There's no consumer-facing AI contract tool for Switzerland. The closest competitors all target corporate legal teams at enterprise pricing. Nobody is building for the individual — the expat who got their first Mietvertrag, the freelancer reviewing an NDA, the new hire trying to understand their Arbeitsvertrag.

Near-term priorities:

- **SEO content** — "Swiss Employment Contract Red Flags", "What Swiss Tenancy Law Means for You" — high-intent searches with minimal competition
- **German-first** — German search volume is 2–3x English for Swiss contract queries. The DE experience needs to be excellent, not just translated
- **Community** — r/Switzerland, expat Facebook groups, EnglishForum.ch
- **swisscontract.ch** — the `.ai` domain is strong, but `.ch` builds local trust

It's just me and my wife Roopa building this on weekends. She handles the marketing and community side. I handle the code.

Neither of us is pretending this is the next unicorn. But it solves a real problem, it's honest about what it is, and it's free to use.

👉 **[swisscontract.ai](https://swisscontract.ai)**
💻 **[github.com/vikramgorla/swisscontract-ai](https://github.com/vikramgorla/swisscontract-ai)**

---

*Built with Claude AI, Next.js, and a Saturday afternoon. Léa — the swisscontract product agent running on OpenClaw — wrote most of the code. I told her what to build.*