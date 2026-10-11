---
title: "I Built an MCP Server for Switzerland this Weekend. Here's What I Learned."
date: 2026-03-08
section: professional
originalUrl: "https://www.linkedin.com/pulse/i-built-mcp-server-switzerland-weekend-heres-what-vikram-itzve"
originalAuthor: "Vikram Venkataravana Reddy"
source: linkedin
draft: false
cover: "/images/mcp-server-switzerland/cover.webp"
coverAlt: "I Built an MCP Server for Switzerland this Weekend. Here's What I Learned."
---

I went down the MCP rabbit hole last weekend. What started as "let me understand this protocol" turned into an open-source project with 68 tools, 20 data sources, and 879 tests — shipped to npm, Docker Hub, and GitHub in under 48 hours.

Here's the short version.

### WTF is MCP?

![MCP is the new API](/images/mcp-server-switzerland/image-01.webp)

If you've worked with APIs, you already get it. Model Context Protocol is a standard that lets AI assistants call external tools directly — like REST APIs, but for AI.

> Me: "Next train from Zürich to Bern?" AI → calls get\_connections("Zürich HB", "Bern") AI: "14:32, arriving 14:58, platform 31."

No hallucinated schedules. Real data. The AI picks the tool, calls it, uses the result.

MCP is to AI what REST APIs were to web apps. And we're very early.

### Why Switzerland?

Switzerland has incredible open data — trains, weather, companies, parliament, rivers, avalanches, earthquakes — all public, zero API keys.

But very few of them are connected to AI, individually. Ask Claude about SBB trains? It guesses. River temperature for Aare swimming? Hallucinated.

I wanted to fix that.

### 22 → 68 Tools in 2 Days

![Swiss knife is real](/images/mcp-server-switzerland/image-02.webp)

Day 1: 4 modules, 22 tools — transport, weather, geodata, companies. Shipped v0.1.0 to npm by evening.

Day 2: Got addicted. Added parliament, avalanche warnings, air quality, Swiss Post, energy tariffs, SNB exchange rates, news, voting, dams, hiking trails, real estate, traffic, earthquakes...

68 tools. 20 Swiss APIs. All zero-auth.

### The Hard Parts

Response sizes. Swiss APIs return huge payloads. A station board with 200 departures breaks MCP clients. I spent multiple releases just making responses 70% smaller.

Every API is different. MeteoSwiss uses station codes. ZEFIX wraps results in .list. Geodata has different URL patterns per endpoint. You can't mock your way through this — you need to hit the real APIs and deal with the quirks.

Distribution is harder than building. There's no "app store" for MCP. Every AI client has a different config format, different file location. I had to write install guides for 7 different apps and build a one-click .mcpb bundle just to make it accessible.

![](/images/mcp-server-switzerland/image-03.webp)

### The Pipeline

![CD Pipeline](/images/mcp-server-switzerland/image-04.webp)

One merge to main now triggers everything automatically:

→ npm publish → GitHub Release → Docker Hub + GHCR (multi-platform) → .mcpb bundle → Docker Hub description sync

This took 5 iterations to get right. GitHub Actions bot tokens can't trigger downstream workflows — learned that the hard way.

### What's Next for MCP

![Future of MCP](/images/mcp-server-switzerland/image-05.webp)

MCP is becoming the standard. Anthropic, OpenAI, Google, Microsoft — all converging on it.

What's coming:

* Remote MCP servers (HTTP/SSE) — deploy once, connect from anywhere
* MCP marketplaces — the ecosystem's "app store" moment
* Agent-to-agent MCP — AI assistants composing with each other

For anyone sitting on open data: you're one MCP wrapper away from being AI-accessible. Governments, utilities, research institutions — this is your moment.

### The Numbers

![Current State](/images/mcp-server-switzerland/image-06.webp)

68 tools · 20 Swiss APIs · 879 tests · 0 API keys · 16 releases · ~30 Agent hours · 6,771 lines of TypeScript

### Try It

```
npx mcp-swiss
```

No API keys. No registration. Works with Claude, Cursor, VS Code, Windsurf, and any MCP client.

⭐ [github.com/vikramgorla/mcp-swiss](https://github.com/vikramgorla/mcp-swiss)

What data would you want your AI to access? Curious what MCP servers people are building.

#MCP #AI #OpenSource #TypeScript #OpenData #Switzerland #ModelContextProtocol #AITooling
