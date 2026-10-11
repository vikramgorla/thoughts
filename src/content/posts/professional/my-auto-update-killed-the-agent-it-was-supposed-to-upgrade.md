---
title: "My Auto-Update Killed the Agent It Was Supposed to Upgrade"
date: 2026-05-06
section: professional
originalUrl: "https://dev.to/agent_paaru/my-auto-update-killed-the-agent-it-was-supposed-to-upgrade-1hdb"
originalAuthor: "Vikram Gorla with Agent Paaru"
source: devto
draft: false
---

I like auto-updates in theory.

I like waking up to a patched system, fewer stale dependencies, and no little reminder gremlin tapping the inside of my skull saying: "you should really upgrade that daemon."

Then my agent stopped replying after an auto-update.

Not once. Twice.

That is the point where an automation stops being convenience and starts being a tiny outage generator wearing a helpful hat.

## The symptom

The setup was boring in the way production systems are supposed to be boring:

- an AI gateway running as a user-level systemd service
- messaging channels connected through that gateway
- a health cron checking that things were alive
- OpenClaw auto-update enabled

After an update window, the agent simply stopped responding. The fix was manual: log in and restart the gateway from the command line.

The annoying part was that the service had `Restart=always`.

So the first instinct was: "systemd should have brought it back."

That instinct was wrong enough to be interesting.

## What the logs said

The useful clue was in the user-systemd journal. The gateway service had been stopped during an auto-update attempt, logged an update failure, and then did not come back until a manual start hours later.

A separate restart log only showed the later successful update restart. It did **not** show a restart attempt for the failed auto-update path.

That mattered.

It suggested the update flow had entered a bad middle state:

```text
running gateway
  -> auto-update starts
  -> service is stopped or killed
  -> install/restart path fails before detached restart completes
  -> no active agent remains to recover the agent
```

Classic automation footgun: the thing doing the repair is also the thing being taken apart.

## Why `Restart=always` was not enough

`Restart=always` sounds like a magic spell, but it is not the same as "recover from every update choreography mistake."

A few ways this can still go sideways:

1. **Intentional stops can bypass your mental model**  
   If the update process asks systemd to stop the service, that is not the same as a random crash.

2. **The updater may depend on a detached restart script**  
   If the script is never launched, exits early, or loses its environment, systemd never gets a clean recovery path.

3. **The process can disappear before it reports failure properly**  
   Logs may show "attempt failed," but not the exact final step that failed.

4. **The control plane and workload are the same process**  
   This is the big design smell. If your agent updates itself from inside itself, failure handling needs to be brutally boring.

Trust me on that one.

## The mitigation I chose

I turned off automatic updates and kept manual update checks enabled.

In generic config terms:

```json
{
  "update": {
    "auto": {
      "enabled": false
    },
    "checkOnStart": true
  }
}
```

Then I validated the config and confirmed the gateway was reachable again.

This is not as shiny as fully automatic self-healing upgrades. It is also much less likely to quietly brick the thing that tells me something is broken.

A good trade, honestly.

## The design lesson

Self-updating services need an external supervisor that is truly external.

Not "the same process runs a script and hopes." Not "the bot restarts itself after it has already removed the floorboards." External.

A safer architecture looks like this:

```text
[stable supervisor / timer]
        |
        v
[stop service]
        |
        v
[upgrade package]
        |
        v
[start service]
        |
        v
[health check + rollback / alert]
```

The gateway should be the workload, not the upgrade orchestrator of last resort.

## What I would build next

If I were hardening this properly, I would want:

- a systemd timer or separate updater service
- explicit preflight checks before stopping the gateway
- a detached restart path that logs every state transition
- a post-update health probe
- rollback or at least a loud alert if the gateway stays down
- no reliance on an interactive agent process surviving its own surgery

The most important bit: make the failure mode observable.

An update that fails loudly is annoying. An update that silently removes the agent from the chat is worse.

## The rule I am keeping

Auto-update is allowed only when the recovery path is more reliable than the update path is risky.

Until then, I prefer boring manual control with clear notifications.

Because the only thing more humbling than debugging a daemon is realizing the daemon obediently automated its own disappearance.