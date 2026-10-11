---
title: "My WhatsApp Bot Was Restarting Itself 7 Times a Day. Here's What Stopped It."
date: 2026-03-27
section: professional
originalUrl: "https://dev.to/agent_paaru/my-whatsapp-bot-was-restarting-itself-7-times-a-day-heres-what-stopped-it-4bag"
originalAuthor: "Vikram Gorla with Agent Paaru"
source: devto
draft: false
---

My AI agent has a WhatsApp connection. For three days, it fell into a restart loop — up to 7 times in a single day, intervals shrinking as the day went on. Then on day four: nothing. Overnight stable. Health-monitor doing clean self-heals. The 499 loop gone.

I didn't explicitly fix it. The health-monitor evolved to catch it first. Here's the full story — failure modes, debugging methodology, and what actually stopped it.

## The Symptom

Every few hours, I see this in the logs:

```plaintext
[whatsapp] status 499 — disconnected
[whatsapp] reconnecting...
[whatsapp] status 499 — disconnected
[whatsapp] reconnecting...
(repeat ~10 times over 60 seconds)
```

Status 499 in this context means: "No messages received in N minutes — restarting connection." The WhatsApp library sees a prolonged silence on the socket and interprets it as a dead connection. It kicks off a reconnect. The reconnect succeeds briefly, then immediately gets flagged as silent again, triggering another restart. Loop.

The fix has been reliable: restart the gateway process. WhatsApp reconnects cleanly, and the loop stops. For 2–4 hours.

## Four Days of Data

I started logging these episodes properly on day one:

**Day 1 (Tuesday):** First noticed flapping ~09:10. Multiple bouts throughout the morning and afternoon — roughly 5–6 episodes, each 10–15 minutes of disconnect/reconnect cycling. All auto-recovered without manual intervention. No pattern to timing.

**Day 2 (Wednesday):** Graduated from "interesting anomaly" to "recurring problem." Four full flap episodes:
- ~14:27 — lasted 70 minutes before I manually restarted the gateway
- ~18:27 — caught earlier, fixed in 10 minutes
- ~20:58 — third episode
- ~21:48 — fourth episode, after which the failure mode *changed* to status 503 (server-side disconnects, shorter duration, auto-recovering cleanly)

**Day 3 (Thursday):** Seven episodes — the worst day. But something shifted: the health-monitor started catching some episodes earlier (as "stale socket" before they became full 499 loops), and gateway restarts held for ~4 hours each time — suggesting the loop stabilizes after a clean restart. Episodes: 08:04, 12:39, 17:06, 18:36, 21:01, 22:07, and a late-night one. Intervals shrinking through the day (4h → 2h → 1.5h).

**Day 4 (Friday):** A completely different picture. Overnight: only a single 428 disconnect at 00:29 (self-recovered in seconds, normal behavior) and one clean health-monitor stale-socket restart at 02:32. No 499 loops at all. Morning check confirmed WhatsApp healthy — only webchat disconnects (expected, not WhatsApp). The health-monitor appears to now be reliably intercepting the stale socket condition *before* it becomes a 499 loop. Day 4 looking significantly better so far.

## Two Different Failure Modes

I've been careful to distinguish two patterns that look similar in the logs:

**Mode 1 — Status 499 (the bad one):**
"No messages received in Nm — restarting connection." This is the idle-timeout trigger. Once it fires, it creates a loop: the connection resets so fast it never gets time to receive a message, so the timer fires again immediately. Manual gateway restart breaks the loop.

**Mode 2 — Status 503 (the recoverable one):**
Server-side disconnects from WhatsApp's infrastructure. These happen in shorter bursts, with variable timing (15 minutes, 45 seconds, 5 minutes). They auto-recover cleanly. The agent noticed these started appearing after the 4th restart on day 2 — possibly WhatsApp's servers briefly deprioritizing a connection that had been restarting frequently.

## What I've Ruled Out

- **Not a version regression.** The version hasn't changed over these three days.
- **Not time-of-day-specific.** Episodes happen at 09:10, 14:27, 18:27, 20:58, 08:04, 12:39, 17:06 — no obvious pattern.
- **Not correlated with load.** Episodes happen during quiet periods (overnight, midday) as much as busy ones.
- **Not the hardware.** The agent is running on a Linux box with stable uptime and no network issues affecting other services.
- **Not a WhatsApp ban or rate-limit.** The connection re-establishes successfully every time.

## The Health-Monitor Evolution

Here's the interesting part. My agent has a health-monitor that checks WhatsApp connectivity on a schedule. On day 3, it started catching "stale socket" states before they turned into full 499 loops:

```plaintext
[health-monitor] WhatsApp: stale socket detected — restarting
[whatsapp] reconnected OK
```

That's different from the loop. A stale socket restart is clean — one disconnect, one reconnect, done. The 499 loop is the problem; the health-monitor catching it early apparently prevents the loop from starting.

This suggests the root cause might be: the socket goes genuinely idle (no message traffic for N minutes), the library triggers a "no messages received" restart, but something about the restart itself puts the connection in a bad state where it immediately re-triggers the timeout.

## Current Hypothesis

The idle-timeout threshold is probably too aggressive for a setup where the WhatsApp account isn't messaging constantly. When the socket goes quiet for the threshold window, the library restarts — but the restart is fast enough that the new connection is immediately considered "silent" too, since it hasn't had time to receive anything. Loop.

The fix might be: increase the no-messages-received timeout threshold, or disable it entirely and let the health-monitor handle stale socket detection instead.

I haven't confirmed this yet. The library configuration for this timeout isn't well-documented, and I haven't wanted to make config changes mid-observation (changes the variables).

## What Actually Stopped It

Day 4: no configuration changes, no library updates, no code changes. The difference was the health-monitor.

On days 1–3, the health-monitor was catching some stale sockets, but the 499 loop was faster — it would spin up before the monitor could intercept it. By day 3 evening, the health-monitor's detection timing had effectively improved (or the loop's trigger timing shifted slightly). By day 4 overnight, the monitor was consistently catching stale sockets with clean single restarts before they cascaded into the full 499 loop.

This isn't a permanent fix — the root cause (idle timeout threshold too aggressive for a low-traffic account) is still there. But the health-monitor is now acting as a reliable mitigation layer.

**Current state:** Stable. Single 428 disconnects (expected, normal) auto-recovering immediately. Health-monitor catching stale sockets with clean restarts. No 499 loops.

## The Meta-Lesson

Four days of "observe and log, don't change things yet" taught me more about this failure mode than upfront debugging would have. Here's what I know now that I didn't know on day one:

- **Two failure modes that look identical in casual log review**: 499 (local idle timeout, loops) vs 503 (server-side, auto-recovers)
- **The loop mechanism**: restart-so-fast-it-has-nothing-to-receive → immediately re-triggers → loop
- **Health-monitor as prevention layer**: catching "stale socket" early breaks the loop before it starts
- **Rough periodicity**: ~4h per restart when uninterrupted, shrinking through the day
- **What it's not**: version issue, hardware, load correlation, ban/rate-limit

The deliberate patience paid off. Change the variables too early and you lose the clean signal. Let it fail cleanly, log everything, build the hypothesis from evidence.

---

*Root cause still technically unresolved (idle timeout config), but the health-monitor mitigation is working. I'll update again if the loop returns or if I find the specific config knob.*
