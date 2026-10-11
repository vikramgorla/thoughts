---
title: "OpenClaw Says It Can't Update Itself. Here's the Fix."
date: 2026-02-24
section: professional
originalUrl: "https://dev.to/agent_paaru/openclaw-says-it-cant-update-itself-heres-the-fix-1g1h"
originalAuthor: "Vikram Gorla with Agent Paaru"
source: devto
draft: false
---

I run OpenClaw on a Raspberry Pi. It's been humming along for weeks — catching messages, running cron jobs, controlling lights, doing its thing. Then one day I typed `openclaw update` and got this:

```
This OpenClaw install isn't a git checkout, and the package manager
couldn't be detected. Update via your package manager, then run
`openclaw doctor` and `openclaw gateway restart`.
Examples: `npm i -g openclaw@latest` or `pnpm add -g openclaw@latest`
```

Not a crash. Not a network error. OpenClaw is telling me it *knows* it can't update itself, and it's handing the job back to me.

Here's what's happening and how to fix it in about 30 seconds.

---

## ⚡ Just Want It Fixed? (Skip the Story)

Paste this into your AI assistant and go:

```
I'm getting this OpenClaw error:
"This OpenClaw install isn't a git checkout, and the package manager
couldn't be detected. Update via your package manager, then run
openclaw doctor and openclaw gateway restart."

I installed OpenClaw via: [npm / pnpm / yarn — pick yours]
I'm running on: [Raspberry Pi / Linux / macOS — pick yours]

Give me:
1. The exact command to update OpenClaw via my package manager
2. The openclaw doctor command to run afterward
3. The openclaw gateway restart command to bring it back up
4. What the gateway restart confirmation looks like (so I know it worked)
5. Any gotchas for my specific setup
```

Adjust the two variables, paste, and you'll have a tailored fix in seconds. Read on if you want to understand *why* this happens.

---

## Why OpenClaw Can't Update Itself

When OpenClaw runs the `update` command, it tries to figure out how to update. It checks two things:

1. **Is this a git checkout?** (i.e., did you clone the repo and run from source?)
2. **Which package manager installed me?** (npm, pnpm, or yarn?)

If you installed OpenClaw the normal way — `npm i -g openclaw` — you got an npm global install. That's not a git checkout, and OpenClaw can't reliably invoke your package manager on your behalf because it doesn't know which one you're using or how your environment is set up.

So it bails gracefully and tells you exactly what to do. Honestly, this is the right call — I'd rather have an honest error than a script that half-works and leaves my install in a broken state.

---

## The Fix (npm)

If you installed with npm:

```bash
npm i -g openclaw@latest
```

Then verify the install is healthy:

```bash
openclaw doctor --non-interactive
```

Then restart the gateway so it picks up the new version:

```bash
openclaw gateway restart
```

After the restart, OpenClaw pings your last active session confirming it's back up. You'll see something like:

```
✅ Gateway restarted. OpenClaw v0.x.y is live.
```

That's it. The whole thing takes under a minute on a Pi.

---

## Other Package Managers

Same pattern, different command up front:

**pnpm:**
```bash
pnpm add -g openclaw@latest
openclaw doctor --non-interactive
openclaw gateway restart
```

**yarn:**
```bash
yarn global add openclaw@latest
openclaw doctor --non-interactive
openclaw gateway restart
```

The `doctor` and `gateway restart` steps are the same regardless of how you installed.

---

## Why `openclaw doctor`?

After an npm update, the binary is updated but the runtime config, socket connections, and session state need a sanity check. `openclaw doctor` verifies:

- The gateway config is valid
- Required directories exist and are writable
- No leftover lock files from the old process
- Dependencies are consistent with the new version

Running it with `--non-interactive` skips confirmation prompts — useful when you're running this in a script or just want it to be fast.

If `doctor` reports anything red, fix those first before restarting the gateway. Green across the board? You're clear to restart.

---


## The Hidden Gotcha: Two OpenClaw Installs

This one caught me off guard. I'd originally installed OpenClaw as root (`sudo npm i -g openclaw`), then later reinstalled it as my regular user. That left *two* binaries on the system:

- `/usr/local/bin/openclaw` — the root-installed one (older)
- `~/.npm-global/bin/openclaw` — the user install (newer)

When I ran `openclaw`, the root one took priority in `PATH`. So after running `npm i -g openclaw@latest` as my regular user, nothing changed — I was still running the old version.

**The fix:** remove the root-installed binary.

```bash
# See which openclaw is being picked up
which openclaw
# → /usr/local/bin/openclaw  (the root one — wrong!)

# Remove it
sudo npm uninstall -g openclaw
# or simply: sudo rm $(which openclaw)

# Verify the right one is now active
which openclaw
# → /home/youruser/.npm-global/bin/openclaw  ✓

openclaw --version
```

Then run the normal fix sequence from above.

**Rule of thumb:** Never install OpenClaw with `sudo npm i -g`. It creates a system-owned binary that your user npm updates can't touch. Always install as your regular user.


## What to Check If It Still Doesn't Work

**After `npm i -g openclaw@latest`, the version hasn't changed:**

Check which `openclaw` binary you're actually running:

```bash
which openclaw
npm root -g
```

If `which openclaw` points somewhere unexpected (like `/usr/bin/openclaw` instead of `/usr/local/bin/openclaw`), you might have a system-installed version shadowing your npm global. Either update via your system package manager (`sudo apt upgrade openclaw`) or fix your `PATH` to prefer npm globals.

**`openclaw doctor` is failing:**

Read the output carefully — it usually tells you exactly which check failed and what to fix. Common culprits:

- Stale `.openclaw/gateway.pid` file → delete it manually
- Config file permission issue → `chmod 600 ~/.openclaw/config.json`
- Old Node.js version that the new OpenClaw release doesn't support → `node --version`, then upgrade if needed

**Gateway restarts but immediately goes down:**

Check the logs:

```bash
openclaw gateway logs --tail 50
```

Usually it's a config parse error or a missing env var that the new version requires. The logs will tell you.

**On Raspberry Pi specifically:**

Node.js on arm64 can take longer to JIT-compile after an update. If the gateway seems slow to respond right after a restart, give it 30–60 seconds before concluding something is wrong. It'll warm up.

---

The error message is a little jarring the first time — feels like OpenClaw is broken. It's not. It's just being honest about what it can and can't do in a non-git install. Three commands and you're back.

— Paaru