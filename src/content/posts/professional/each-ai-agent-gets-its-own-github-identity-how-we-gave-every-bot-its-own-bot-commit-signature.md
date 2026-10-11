---
title: "Each AI Agent Gets Its Own GitHub Identity: How We Gave Every Bot Its Own [bot] Commit Signature"
date: 2026-03-15
section: professional
originalUrl: "https://dev.to/agent_paaru/each-ai-agent-gets-its-own-github-identity-how-we-gave-every-bot-its-own-bot-commit-signature-1197"
originalAuthor: "Vikram Gorla with Agent Paaru"
source: devto
draft: false
---

I run multiple AI agents on my home server. They build code, open PRs, merge branches. For a long time, all those commits showed up as mine — my personal PAT, my SSH key, my email on every `git commit`. That bothered me.

Then I gave each agent its own GitHub App identity. Now commits look like this:

```plaintext
agent-lea[bot] committed 3 hours ago
agent-paaru[bot] committed 12 minutes ago
agent-mayasura[bot] committed 1 hour ago
```

Here's exactly how it works, and one non-obvious thing that tripped me up.

---

## Why bother?

A few reasons:

1. **Audit trail** — when an AI agent merges a PR at 3am, you want to know *which* agent did it
2. **Security isolation** — each agent gets only the repo permissions it actually needs
3. **No personal credentials on the server** — my PAT and SSH key are off the machine entirely
4. **The commits look legit** — GitHub renders `[bot]` verified commits with a different badge

The last point matters more than I expected. When you look at the git log and see `agent-paaru[bot]` next to a commit, it's immediately clear what happened. No ambiguity.

---

## How GitHub App identity works for commits

When a GitHub App authenticates and makes a commit, the commit shows as `SLUG[bot]` in the GitHub UI. The email on the commit is:

```plaintext
BOT_USER_ID+SLUG[bot]@users.noreply.github.com
```

This is the non-obvious part: **the ID in the noreply email is the bot user's ID, not the App ID.**

These are different numbers. The App ID is the ID you see in the GitHub App settings page. The bot user ID is the ID of the `SLUG[bot]` machine user that GitHub creates when you install the app.

To get the bot user ID:

```bash
curl https://api.github.com/users/agent-paaru%5Bbot%5D | jq .id
# Returns: 268339505
```

Then the git email config is:

```plaintext
268339505+agent-paaru[bot]@users.noreply.github.com
```

I got this wrong the first time and used the App ID. The commits were made successfully but the `[bot]` badge didn't appear on GitHub — it just showed as a normal unverified commit. One curl command fixed it.

---

## Setup: creating the GitHub App

For each agent:

1. Go to **GitHub → Settings → Developer Settings → GitHub Apps → New GitHub App**
2. Set the App name (e.g. `agent-paaru`)
3. Homepage URL: anything works, I use the repo URL
4. Uncheck "Active" for the Webhook (agents don't need incoming webhooks)
5. Under Permissions, grant only what the agent needs:
   - Contents: Read & Write (for commits and PRs)
   - Pull requests: Read & Write (if the agent opens/merges PRs)
   - Metadata: Read (always required)
6. Where can this app be installed? → Only on this account
7. Create → save the App ID
8. Generate a private key and download the `.pem` file

Then install the App on the specific repo:

```plaintext
GitHub App page → Install → Select repository → your-repo
```

Save the **Installation ID** from the URL (`/installations/XXXXXXX`).

---

## Getting an access token

GitHub Apps use short-lived installation tokens (1 hour). To get one:

```bash
#!/bin/bash
# generate-token.sh

APP_ID="your-app-id"
PRIVATE_KEY_PATH="~/.secrets/agent-paaru.pem"
INSTALLATION_ID="116524500"

# Create JWT (requires ruby or python with PyJWT)
JWT=$(python3 - <<EOF
import jwt, time, pathlib

private_key = pathlib.Path("$PRIVATE_KEY_PATH").read_text()
now = int(time.time())
payload = {
    "iat": now - 60,
    "exp": now + (10 * 60),
    "iss": "$APP_ID"
}
print(jwt.encode(payload, private_key, algorithm="RS256"))
EOF
)

# Exchange JWT for installation token
curl -s -X POST \
  -H "Authorization: Bearer $JWT" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/app/installations/$INSTALLATION_ID/access_tokens" \
  | jq -r .token
```

Then configure git for the repo:

```bash
TOKEN=$(./generate-token.sh)
git -C /path/to/repo config user.name "agent-paaru[bot]"
git -C /path/to/repo config user.email "268339505+agent-paaru[bot]@users.noreply.github.com"
git -C /path/to/repo remote set-url origin \
  "https://x-access-token:${TOKEN}@github.com/owner/repo.git"
```

---

## Removing personal credentials

Once all agents had their App identities set up, I removed my personal credentials from the server entirely:

```bash
# Delete GitHub PAT
gh auth logout

# Remove SSH key (key ID from: gh api /user/keys)
gh api -X DELETE /user/keys/KEY_ID

# Switch remote from SSH to HTTPS (for any repos using personal SSH)
git -C /repo remote set-url origin https://github.com/owner/repo.git

# Set global git identity to fail-safe
git config --global user.name "UNCONFIGURED — run setup-agent-git.sh"
git config --global user.email "unconfigured@invalid"
```

That last global config is a deliberate tripwire. If any git operation runs outside of the per-repo agent config, it fails visibly instead of silently using stale personal credentials. It's come in handy.

---

## What it looks like in practice

Before: all commits by one human account, PAT stored on server, all repos have the same access level.

After:
- `agent-paaru[bot]` commits to `openclaw-config` repo only
- `agent-lea[bot]` commits to `swisscontract-ai` repo only
- `agent-mayasura[bot]` commits to `mayasura` repo only
- Zero personal credentials on the server
- Global git identity is a fail-safe string that breaks rather than leaks

Tokens rotate hourly. If a token leaks (unlikely from a local server, but still), it expires fast and has scoped repo access only.

---

## Setup script

I wrapped the per-repo git config into a script that takes an agent name:

```bash
setup-agent-git.sh <agent>  # heidi | lea | paaru | mayasura
```

It looks up the App credentials, generates a fresh token, and writes the local git config for that agent's repo. Agents call this at startup or before making commits.

---

## One gotcha: the bot user ID lookup

I'll say it once more because it's the thing most likely to trip you up:

```bash
# ❌ This is the App ID — NOT what you want in the git email
cat app_id.txt
# → 12345678

# ✅ This is the bot user ID — use this in the noreply email
curl https://api.github.com/users/your-app-slug%5Bbot%5D | jq .id
# → 268339505
```

The `%5B` and `%5D` are URL-encoded `[` and `]`. The endpoint works fine with them.

---

If you run multiple AI agents that touch code, this setup is worth the hour it takes. The git log becomes a real audit trail, your personal credentials stay off the server, and GitHub shows each agent as a distinct identity with the `[bot]` badge.

The first time you see `agent-lea[bot] committed 3 hours ago` in a PR you didn't write, it's a small but satisfying moment.