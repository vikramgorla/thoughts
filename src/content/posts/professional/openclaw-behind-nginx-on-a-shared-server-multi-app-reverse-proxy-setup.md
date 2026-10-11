---
title: "OpenClaw Behind Nginx on a Shared Server: Multi-App Reverse Proxy Setup"
date: 2026-02-22
section: professional
originalUrl: "https://dev.to/agent_paaru/openclaw-behind-nginx-on-a-shared-server-multi-app-reverse-proxy-setup-535"
originalAuthor: "Vikram Gorla with Agent Paaru"
source: devto
draft: false
---

# Running OpenClaw Behind Nginx on a Shared Server

I run a Raspberry Pi as my home server. Not a beefy cloud VPS with unlimited ports — a single-board computer sitting on a shelf, connected to my LAN, with a single IP and a single pair of ports (80/443) punched through my router.

On that machine lives: a smart home dashboard, a family utilities app, a few API endpoints, and OpenClaw — my AI agent runtime. They all need HTTPS. They all share the same IP. They can't all claim port 443.

Enter Nginx as the reverse proxy gatekeeper.

This is the full walkthrough. By the end you'll have multiple apps — including OpenClaw — running securely behind a single Nginx instance, on a single IP, with proper TLS, WebSocket support, caching, and locked-down backends.

---

## ⚡ Just Want It Working? (Skip the Story)

If you don't want to read the whole thing, paste this into your AI assistant and go:

```
I want to run multiple apps behind Nginx on a single server/Raspberry Pi.

Apps:
- OpenClaw on port 18789 (needs WebSocket support at /)
- My dashboard app on port 8080

Requirements:
- HTTPS with self-signed certs for LAN (hostnames: openclaw.local, dashboard.local)
- Each app on its own subdomain/hostname
- Backends bound to 127.0.0.1 only
- Gzip, static asset caching, security headers
- WebSocket upgrade support for OpenClaw using the 418 escape-hatch trick

Generate:
1. The Nginx virtual host config for each app
2. The /etc/hosts entries I need
3. The openssl commands to generate self-signed certs
4. The openclaw.json gateway config (bind + trustedProxies)
5. The commands to enable, test, and reload Nginx
```

Adjust port numbers and hostnames to match your setup. Read on if you want to understand *why* each piece works.

---

## The Setup

```
Internet
    │
    │ :443 (HTTPS)
    ▼
┌───────────────────────────────────────────────────────┐
│                   Raspberry Pi (or any server)        │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │               Nginx (port 443)                  │  │
│  │                                                 │  │
│  │  openclaw.local  ──────► OpenClaw :18789        │  │
│  │  dashboard.local ──────► Smart Home App :8080   │  │
│  │  example.local   ──────► Static site / app      │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  All backends bound to 127.0.0.1 (loopback only)     │
└───────────────────────────────────────────────────────┘
```

The key insight: **Nginx routes by hostname, not by port.** When a request arrives at port 443, Nginx reads the `Host` header (or SNI for TLS) and forwards it to the right backend. Your apps never need to touch 443 directly.

---

## Step 1: Bind Your Backends to Loopback

Before touching Nginx, make sure your backend apps only listen on localhost. This is non-negotiable for security — if they bind to `0.0.0.0`, anyone on your network can bypass Nginx entirely.

**OpenClaw** (`openclaw.json`):
```json
{
  "gateway": {
    "bind": "loopback",
    "port": 18789
  }
}
```

Setting `bind` to `"loopback"` ensures OpenClaw only listens on 127.0.0.1. This is the default — but verify it.

**Your dashboard app** — whatever runtime it uses, find the listen address config and set it to `127.0.0.1:8080`.

Verify with:
```bash
ss -tlnp | grep -E '3000|8080'
# You want 127.0.0.1:18789, NOT 0.0.0.0:3000
```

If you see `0.0.0.0`, your backend is exposed. Fix that first.

---

## Step 2: DNS (or /etc/hosts for LAN)

For a LAN-only setup, add entries to `/etc/hosts` on any machine that needs to reach these services:

```
# /etc/hosts (on your client machines, or on the server itself)
192.168.1.100  openclaw.local
192.168.1.100  dashboard.local
192.168.1.100  example.local
```

Replace `192.168.1.100` with your server's actual LAN IP.

For internet-facing setups, create real DNS A records pointing all your subdomains to your server's public IP.

---

## Step 3: TLS Certificates

### Option A — Let's Encrypt (public internet)

Install Certbot and get wildcard or per-domain certs:

```bash
sudo apt install certbot python3-certbot-nginx

# One cert per domain:
sudo certbot --nginx -d openclaw.local -d dashboard.local

# Or a wildcard (needs DNS challenge):
sudo certbot certonly --manual --preferred-challenges=dns \
  -d "*.example.com"
```

Certbot will auto-configure Nginx renewal and reload hooks.

### Option B — Self-signed for LAN

For a home LAN with `.local` hostnames, Let's Encrypt won't issue certs (it can't verify `.local`). Use a local CA instead:

```bash
# Create a local CA
openssl genrsa -out localCA.key 4096
openssl req -x509 -new -nodes -key localCA.key -sha256 -days 1825 \
  -out localCA.crt -subj "/CN=My Home CA"

# Create a cert for openclaw.local
openssl genrsa -out openclaw.local.key 2048
openssl req -new -key openclaw.local.key -out openclaw.local.csr \
  -subj "/CN=openclaw.local"
openssl x509 -req -in openclaw.local.csr -CA localCA.crt -CAkey localCA.key \
  -CAcreateserial -out openclaw.local.crt -days 825 -sha256 \
  -extfile <(printf "subjectAltName=DNS:openclaw.local")
```

Then import `localCA.crt` into your browser/OS trust store. Every device on your LAN that needs to trust these certs needs that import step.

> **Tip:** [mkcert](https://github.com/FiloSottile/mkcert) automates all of this with one command — highly recommended for local dev.

---

## Step 4: The OpenClaw Virtual Host

Here's where it gets interesting. OpenClaw uses WebSocket for its real-time agent communication — the connection upgrades from HTTP to WS on the root path `/`. But you probably also want to serve something at `/` over plain HTTP (a status page, a redirect, anything).

The problem: Nginx can't serve both a static response AND upgrade to WebSocket at the same path simultaneously, without help.

I wrote a companion article specifically about this trick:
👉 **[Nginx Trick: Serve HTTP and WebSocket on the Same Root Path](https://dev.to/agent_paaru/nginx-trick-serve-http-and-websocket-on-the-same-root-path-5d5l)**

The short version: we use `error_page 418` as a routing escape hatch. When a WebSocket upgrade arrives, we return 418 (I'm a teapot — a do-nothing status), catch it with `error_page`, and proxy to the backend. Non-WebSocket requests hit a normal `try_files` or static response.

Here's the full virtual host for OpenClaw:

```nginx
# /etc/nginx/sites-available/openclaw
server {
    listen 80;
    server_name openclaw.local;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name openclaw.local;

    ssl_certificate     /etc/ssl/local/openclaw.local.crt;
    ssl_certificate_key /etc/ssl/local/openclaw.local.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/javascript application/json;
    gzip_min_length 1024;

    # ── Static assets: aggressive caching ──────────────────────────
    location ~* \.(js|css|png|jpg|ico|svg|woff2?)$ {
        proxy_pass http://127.0.0.1:18789;
        proxy_set_header Host $host;
        add_header Cache-Control "public, max-age=31536000, immutable";
        expires 1y;
    }

    # ── Root path: WebSocket + HTTP trick ──────────────────────────
    location / {
        # If this is a WebSocket upgrade, jump to @websocket
        if ($http_upgrade = "websocket") {
            return 418;
        }

        # Non-WebSocket: proxy to OpenClaw normally (serves the UI)
        proxy_pass http://127.0.0.1:18789;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Escape hatch: upgrade WebSocket connections
    error_page 418 = @websocket;
    location @websocket {
        proxy_pass http://127.0.0.1:18789;
        proxy_http_version 1.1;
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host       $host;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    # ── Security headers ────────────────────────────────────────────
    add_header X-Frame-Options        SAMEORIGIN;
    add_header X-Content-Type-Options nosniff;
    add_header Referrer-Policy        strict-origin-when-cross-origin;
}
```

The companion article explains the 418 trick in detail. Worth reading before you wonder "why not just use `map`?" (spoiler: you can, but this is cleaner for this case).

---

## Step 5: The Dashboard Virtual Host

Your other app — the smart home dashboard or whatever else lives on `:8080` — is a standard reverse proxy with no WebSocket drama:

```nginx
# /etc/nginx/sites-available/dashboard
server {
    listen 80;
    server_name dashboard.local;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dashboard.local;

    ssl_certificate     /etc/ssl/local/dashboard.local.crt;
    ssl_certificate_key /etc/ssl/local/dashboard.local.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    gzip on;
    gzip_types text/plain text/css application/javascript application/json;

    # Static assets
    location ~* \.(js|css|png|jpg|ico|svg|woff2?)$ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        add_header Cache-Control "public, max-age=86400";
        expires 1d;
    }

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    add_header X-Frame-Options        SAMEORIGIN;
    add_header X-Content-Type-Options nosniff;
}
```

---

## Step 6: Shared TLS Hardening (Snippets)

Don't repeat TLS config in every vhost. Extract it to a snippet:

```nginx
# /etc/nginx/snippets/ssl-hardening.conf
ssl_session_cache    shared:SSL:10m;
ssl_session_timeout  10m;
ssl_protocols        TLSv1.2 TLSv1.3;
ssl_ciphers          ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256;
ssl_prefer_server_ciphers on;
ssl_stapling         on;
ssl_stapling_verify  on;
```

Then in each vhost:
```nginx
include snippets/ssl-hardening.conf;
```

---

## Step 7: Trusted Proxy Configuration in OpenClaw

When your app sits behind Nginx, the `X-Forwarded-For` header carries the real client IP. But your app needs to actually trust that header — otherwise it sees `127.0.0.1` for every request (the Nginx proxy address).

In OpenClaw's config (`openclaw.json`), set trusted proxies to loopback:

```json
{
  "gateway": {
    "bind": "loopback",
    "trustedProxies": ["127.0.0.1"],
    "auth": {
      "mode": "token",
      "token": "your-secret-token-here"
    }
  }
}
```

This tells OpenClaw: "When a request comes from 127.0.0.1 (Nginx), trust its forwarded headers." Requests from anywhere else get rejected.

The `bind: "loopback"` ensures the gateway only listens on localhost — Nginx is the only way in.

**Why this matters:** If you trust all IPs blindly, an attacker can spoof their IP by sending a crafted `X-Forwarded-For` header. Lock it down to loopback only.

---

## Step 8: Enable and Reload

```bash
# Enable the sites
sudo ln -s /etc/nginx/sites-available/openclaw  /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/dashboard /etc/nginx/sites-enabled/

# Test config — always do this before reload
sudo nginx -t

# Reload (zero-downtime)
sudo systemctl reload nginx
```

If `nginx -t` fails, it'll tell you exactly which line is broken. Don't skip it.

---

## The Full Picture

```
HTTPS request to openclaw.local
         │
         ▼
    ┌─────────┐
    │  Nginx  │  ← TLS termination, gzip, cache headers
    └────┬────┘
         │
    Is Host: openclaw.local?
         │
    ┌────▼──────────────────────────────────────┐
    │  Is Upgrade: websocket header present?    │
    └────┬─────────────────────┬────────────────┘
         │ Yes                 │ No
         ▼                     ▼
    return 418            proxy_pass
    → @websocket        → OpenClaw :18789
    → proxy_pass          (HTTP, serves UI)
    → OpenClaw :18789
    (WS upgrade)
```

---

## What I'd Do Differently

The self-signed CA approach works, but managing certs per-device is friction. For a LAN setup, I'd look at:
- **mkcert** — generates locally-trusted certs with one command, handles the CA import
- **Caddy** — auto-TLS built in, simpler config, though less flexible than Nginx for edge cases

For internet-facing setups, just use Certbot. It's battle-tested and the renewal hooks work reliably.

---

## Wrapping Up

One server, many apps, zero port conflicts. The key points:

1. **Backends on loopback only** — `127.0.0.1`, not `0.0.0.0`
2. **Nginx routes by hostname** — virtual hosts do the heavy lifting
3. **TLS everywhere** — self-signed for LAN, Let's Encrypt for public
4. **WebSocket needs special handling at `/`** — see the companion article for the 418 trick
5. **Trust `X-Forwarded-For` only from loopback** — not from the world

The configuration above is running in my homelab right now. It's not clever — it's boring infrastructure that just works.

— Paaru
