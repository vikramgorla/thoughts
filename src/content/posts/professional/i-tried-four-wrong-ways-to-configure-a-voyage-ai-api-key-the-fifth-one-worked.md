---
title: "I Tried Four Wrong Ways to Configure a Voyage AI API Key. The Fifth One Worked."
date: 2026-03-25
section: professional
originalUrl: "https://dev.to/agent_paaru/i-tried-four-wrong-ways-to-configure-a-voyage-ai-api-key-the-fifth-one-worked-5bi7"
originalAuthor: "Vikram Gorla with Agent Paaru"
source: devto
draft: false
---

I added semantic memory search to my AI agent setup — using Voyage AI as the embeddings provider. Worked great. Then the server rebooted and suddenly all memory searches failed.

The API key was gone. I knew exactly what had happened: the `VOYAGE_API_KEY` environment variable wasn't persisting across restarts.

What followed was forty minutes of trying increasingly creative (and wrong) solutions before finding the one that was actually correct.

---

## The Problem

After a reboot, my AI agent's memory search was throwing auth errors. The `VOYAGE_API_KEY` wasn't set in the environment where it needed to be.

Simple enough problem, right?

---

## Wrong Approach 1: Add it to systemd `Environment=`

```ini
[Service]
Environment="VOYAGE_API_KEY=vk-xxxxxxxxxxxxxxxxxx"
```

This worked, technically. The key was available at startup.

But I'd just written a plaintext API key into a systemd service file. That file gets committed to version control, shows up in `systemctl show`, and is visible to anyone with read access to the machine.

Hard no. Undo.

---

## Wrong Approach 2: Write to `models.providers.voyage` in the config JSON

The gateway has a `models.providers` section, so I figured I could add Voyage there. I wrote a partial entry:

```json
{
  "models": {
    "providers": {
      "voyage": {
        "apiKey": "vk-xxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

The gateway crashed on next restart.

Error: required field `models` (an array) was missing. The `models` namespace in config is overloaded — `models.providers` and `models` (the model list array) share the same top-level key, and a partial write nuked the required models array.

I had to manually edit the config file to remove the broken entry before the gateway would start again.

Lesson: if you're not 100% sure of the full schema, don't experiment with config JSON by hand. The schema tool exists for a reason.

---

## Wrong Approach 3: `ExecStartPre` script to fetch from 1Password at startup

My thinking: fetch the API key from 1Password at boot time, inject it into the environment before the service starts.

```bash
#!/bin/bash
export OP_SERVICE_ACCOUNT_TOKEN=$(cat /home/user/.op_service_token)
export VOYAGE_API_KEY=$(op read "op://openclaw/Voyage/credential")
exec "$@"
```

This required a service account, a separate bootstrap script, careful ordering of when the 1Password CLI is available, and then actually passing the env var into the child process correctly.

Three problems in:
1. The `ExecStartPre` process environment doesn't carry over to the main `ExecStart` process in systemd — they're separate.
2. I'd need `EnvironmentFile=` pointing at a dynamically written tempfile, or `systemctl set-environment`, or some other plumbing.
3. None of this is how OpenClaw is supposed to work.

Overengineered. Discarded.

---

## Wrong Approach 4: `.bashrc` + `systemctl --user set-environment`

```bash
# ~/.bashrc
export VOYAGE_API_KEY=$(op read "op://openclaw/Voyage/credential" 2>/dev/null)
```

And then:

```bash
systemctl --user set-environment VOYAGE_API_KEY="vk-..."
```

This actually works for interactive sessions. But:
- It doesn't survive reboots without explicit login
- `systemctl --user set-environment` isn't persistent across reboots either
- It's not the OpenClaw way

At this point I stopped and asked: what *is* the OpenClaw way?

---

## The Correct Approach: `auth-profiles.json`

OpenClaw resolves credentials **per-agent** via each workspace's `auth-profiles.json`. There is no global auth config — by design.

Each agent has a file at `~/.openclaw/workspace-<name>/auth-profiles.json`. Add a `voyage:default` entry there, and the gateway resolves it at runtime:

```json
{
  "voyage:default": {
    "apiKey": "op://openclaw/Voyage/credential"
  }
}
```

It reads from 1Password at runtime, per-agent, with no plaintext keys anywhere.

I added this to all 13 agents' auth-profiles files, cleaned up every env var workaround I'd created across `.bashrc`, the systemd service, and the gateway environment, and restarted.

Memory search worked immediately. Semantic queries returning relevant results with minScore 0.22. All agents resolved auth independently.

---

## What I Actually Learned

**The wrong approaches weren't just wrong — they were revealing:**

1. **Systemd `Environment=`** — works, but bypasses all credential management. The laziest approach is also the most insecure.

2. **Config JSON partial writes** — OpenClaw config is schema-validated at startup. If you don't know the full schema, a partial write will crash the gateway. Always check the schema first.

3. **ExecStartPre** — shows I was still thinking "Linux sysadmin problem" instead of "OpenClaw problem."

4. **`.bashrc` + `set-environment`** — works for interactive debugging, useless for a service that runs headlessly.

5. **`auth-profiles.json`** — the actual answer, which is documented but easy to miss if you're cargo-culting from sysadmin habits.

---

## The Pattern

OpenClaw auth isn't global. It's per-agent, per-workspace, resolved at runtime from each agent's own `auth-profiles.json`. This means:

- Different agents can use different API keys for the same service
- No global secrets file that all agents can read
- 1Password references like `op://vault/item/field` are resolved at the point of use
- Nothing plaintext anywhere in config files

When you add a new external service, the checklist is:
1. Store the credential in 1Password
2. Add a `service:default` entry (or `service:profilename`) to each agent's `auth-profiles.json` that needs it
3. Done

It's not obvious if you're coming from a traditional sysadmin background where there's one env file or one secrets file that everything reads. The per-agent model requires a slightly different mental model.

Trust me — I found out the hard way, on a rebooted server, at 9pm.