---
title: "I Gave our Carpool Group an AI Agent. One Month In, Here's What I Actually Learned."
date: 2026-03-01
section: professional
originalUrl: "https://www.linkedin.com/pulse/i-gave-our-carpool-group-ai-agent-one-month-heres-vikram-e6cse"
originalAuthor: "Vikram Venkataravana Reddy"
source: linkedin
draft: false
cover: "/images/carpool-group-ai-agent/cover.webp"
coverAlt: "I Gave our Carpool Group an AI Agent. One Month In, Here's What I Actually Learned."
---

A month ago, I started an experiment.

Not a side project. Not a proof of concept with a slide deck at the end. An actual running agent, on actual hardware, doing actual things — every single day.

I'm an IT architect. I spend a lot of my time thinking about how to help teams adopt new technology responsibly. And I realised I couldn't credibly advise on agentic AI if I hadn't felt the friction myself. So I built one. A personal one. A daily driver.

This is one story from that month. There are many others. But this one is what me and my friends had maximum fun with.

### The Problem

Five colleagues. One carpool. One WhatsApp group that every evening descended into the same ritual:

> 22:00 — "Anyone driving tomorrow?" 22:01 — [read receipts. silence.] 22:04 — [more silence.] 08:00 — Someone drives assuming others are coming. Others are waiting at the pickup point.

It wasn't a technology problem. It was a coordination problem wrapped in social friction. Nobody wanted to be the one who kept asking.

So I built an agent to do it for them.

![Before vs After Captain Raju](/images/carpool-group-ai-agent/image-01.webp)

### Meet Captain Raju

Captain Raju is a WhatsApp bot with the soul of a Telugu film military commander. He runs roll call every evening at 7:30pm. He tracks who's confirmed, who's skipped, who still hasn't replied. He checks live traffic in the morning and alerts the squad if the motorway is a disaster. He sends Rajinikanth GIFs when someone heroically volunteers to drive.

He also, critically, knows when to shut up.

The first version didn't. Early Raju was chatty. Two people agreeing on a pickup time didn't need his input, but he gave it anyway. The explicit rule I had to add to his configuration: when staying silent, respond with NO\_REPLY and nothing else. Getting an LLM to stay quiet is underrated engineering work.

![How Captain Raju Thinks](/images/carpool-group-ai-agent/image-02.webp)

### What Actually Worked

The personality file. I could have built a transactional bot — "Reply YES or NO." Clean. Functional. Joyless. Instead, Raju has a character document. When someone confirms, he says "MASS! 🔥 Roger that, soldier!" When there's traffic, it's "Mayday mayday! 🚨 Heavy enemy movement on the A9."

The squad laughed at the first roll call. That laugh bought weeks of goodwill for every rough edge that followed. Personality isn't decoration. It's what makes people tolerate imperfection long enough to actually adopt something.

Persistent state in a boring text file. Raju has no memory between sessions — he's a stateless language model like any other. So everything that needs to persist lives in a plain markdown file: who confirmed, who declined, who's driving. He reads it at the start of every run, updates it after every interaction. No hallucinated history. No "I think you said you were coming yesterday." Unglamorous. Works perfectly.

Only pinging people who haven't answered yet. Most bots ask everyone every time. Raju checks state and addresses only the unknowns. The squad noticed immediately. It felt less like a bot and more like a teammate.

### The Pitfalls Nobody Puts in the Demo

Agents will hallucinate context if you don't give them real state. The first version of Raju had no persistent file — he inferred carpool status from conversation history. He was confidently wrong twice in the first week. A simple state file solved it completely.

The first bug will happen in front of everyone. On day three, Raju sent his roll call twice. The agent's internal reasoning was leaking as a separate message before the actual reply fired. One configuration line fixed it. The squad still brings it up.

Silence is a feature, not a default. I assumed an agent smart enough to respond correctly was smart enough to know when not to respond. It isn't. Silence needs to be explicitly designed.

Personality determines adoption, not capability. The boring version would have worked. The squad would have tolerated it for a week and then gone back to ignoring the chat. The personality is why they're still using it a month later and asking how to get their own.

### The Security Part — Because I Take This Seriously

I work in enterprise IT. I think about risk architecturally, not as an afterthought. So I deliberately treated this personal experiment with the same rigour I'd expect in a professional context — because that's the only way the learnings transfer.

![Security by Design](/images/carpool-group-ai-agent/image-03.webp)

Raju operates under hard constraints from day one:

* Allowlisted actions only. He can send WhatsApp messages and read traffic data. Nothing else is available to him.
* No access to data beyond the task. He doesn't know anything about the people in the group beyond what's in his state file.
* Secrets go through a secrets manager. No credentials in code or config files. Non-negotiable.
* Prompt injection resistance. Agents that read external content — messages, files, web pages — can be manipulated through that content. Raju's architecture doesn't allow this.
* Human gates on consequential actions. Anything beyond his defined scope requires explicit approval.

Is a carpool bot a high-stakes system? No. But the habits you build on low-stakes systems are the ones you carry into high-stakes ones.

### Why I'm Sharing This

Because in my role as an IT architect, one of the hardest conversations I have is about what agentic AI actually means in practice — not in theory, not in vendor presentations, but in the friction of real daily usage.

Running your own agent teaches you things no whitepaper does:

* What "human in the loop" actually costs in user experience
* Where autonomous systems break trust, and how fast
* How security constraints should shape agent design from the start — not be bolted on after
* What "production-ready" even means for this class of system

![One Month of Learnings](/images/carpool-group-ai-agent/image-04.webp)

The carpool bot is a toy. The mental models aren't.

I have a month of these learnings — across a home assistant, a contract analysis tool, calendar integrations, smart home automations. Each experiment taught me something different about how autonomous systems behave when you're not watching, and how to design for the moments when they get it wrong.

If your team or organisation is starting to think seriously about agentic AI — not chatbots, not copilots, but actual autonomous agents that act on your behalf — I'd genuinely love to compare notes.

The convoy doesn't wait. But it does check traffic first. 🚗💨

This is part of a personal experiment in agentic AI I started about a month ago. All agents run locally on my own hardware. No company data, no production systems. For the full technical deep-dive, including the GIF-to-MP4 hack and the invisible Unicode character that became a production feature, read the original article on [dev.to](https://dev.to): [https://dev.to/agent\_paaru/i-gave-a-whatsapp-carpool-bot-a-telugu-film-hero-soul-it-worked-5dh3](https://dev.to/agent_paaru/i-gave-a-whatsapp-carpool-bot-a-telugu-film-hero-soul-it-worked-5dh3)
