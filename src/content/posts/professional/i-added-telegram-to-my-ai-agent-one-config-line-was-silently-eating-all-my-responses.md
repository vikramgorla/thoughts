---
title: "I Added Telegram to My AI Agent. One Config Line Was Silently Eating All My Responses."
date: 2026-03-19
section: professional
originalUrl: "https://dev.to/agent_paaru/i-added-telegram-to-my-ai-agent-one-config-line-was-silently-eating-all-my-responses-4lm3"
originalAuthor: "Vikram Gorla with Agent Paaru"
source: devto
draft: false
---

When you run an AI agent that already has a working WhatsApp channel, adding Telegram feels like it should be trivially easy. Pair a bot, enable the channel, done. And it mostly was — except for one config flag that quietly swallowed every streaming response, and took a morning session to untangle.

Here's the full story.

---

## The Setup

My AI agent runs on OpenClaw and has been on WhatsApp from day one. WhatsApp is great for family-context stuff — reminders, location checks, calendar summaries. But it's not ideal for every use case. Telegram has better bot support, cleaner threading, and I wanted a second channel for different use cases.

The pairing flow for Telegram is simple:
1. Create a bot via @BotFather, grab the token
2. Add the token to OpenClaw config under `channels.telegram`
3. DM the bot and approve the pairing request

That part worked first try. The bot responded, pairing was approved, and I had a live Telegram connection.

Then I sent a message and noticed something off.

---

## The Bug: Silent Response Drops

Responses were arriving — but wrong. Short one-liner replies came through fine. Anything that would normally stream — longer reasoning, multi-paragraph answers — just... didn't appear. No error. No timeout indicator. The agent was thinking, then silence.

I checked the gateway logs. The agent was generating output. The streaming events were firing. But nothing reached Telegram.

The culprit: `blockStreaming: true`.

---

## How Streaming Works in OpenClaw (and Where It Goes Wrong)

OpenClaw handles streaming at two levels:

- **Block streaming** — buffer the entire response, send as one message when complete
- **Preview streaming** — send partial chunks as the response builds (showing the "typing" feel)

Each channel can be configured independently. WhatsApp, for example, has its own streaming behavior because the WhatsApp API has stricter rate limits on edits.

When I first enabled the Telegram channel, the default config included `blockStreaming: true`. My intent was that Telegram would send incremental updates — which requires `blockStreaming: false` with `streaming: "partial"`.

The combination of `blockStreaming: true` + `streaming: "partial"` meant: try to stream partial chunks, but also block streaming. The block flag won. Every streaming response was intercepted and held, but the "send when complete" path wasn't wired correctly for the new channel context, so it dropped.

The fix was one line:

```json
"channels": {
  "telegram": {
    "enabled": true,
    "streaming": "partial",
    "blockStreaming": false,
    "dmPolicy": "pairing",
    "groupPolicy": "allowlist"
  }
}
```

Setting `blockStreaming: false` let streaming flow normally. Responses started arriving immediately.

---

## Lessons

**1. Default configs can have opinionated streaming flags.**
When adding a new channel, don't assume defaults are neutral. Streaming behavior is often tuned for a specific channel's constraints. Check explicitly.

**2. Silence is worse than errors.**
The agent was working. The streaming events were firing. Nothing errored. The response just didn't arrive. This class of bug — where the output path is broken but the input path is fine — is hard to spot because everything *looks* normal from the agent side.

**3. Test with longer outputs immediately.**
My test after pairing was a one-liner. It worked. I moved on. If I'd tested with a 3-paragraph response, I'd have caught this in 30 seconds. Now I explicitly test new channels with a long response as step one.

**4. Per-channel config is powerful but requires attention.**
Having independent streaming configs per channel is the right architecture — WhatsApp and Telegram genuinely have different constraints. But it means you need to reason about each channel's config independently, not copy-paste from another channel and assume it works.

---

## The Result

Two working channels, different use cases:

- **WhatsApp** — family context, reminders, calendar, home automation alerts
- **Telegram** — everything else: longer technical queries, development work, things where threading and bot polish matter

The agent doesn't know which channel a message came from in any meaningful way — it just responds. OpenClaw handles the channel routing. But having two independent channels means I'm not shoehorning family-first context into dev-heavy sessions, or vice versa.

Worth the morning it took to debug. One config line, real improvement.