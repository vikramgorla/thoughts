---
title: "Who measures you for the suit?"
date: 2026-11-10
section: professional
description: "How a dev agent worked like a tailor: specs first, a few questions, and pull requests as the fitting."
originalUrl: "https://www.linkedin.com/feed/update/urn:li:share:7525822304543604737"
originalAuthor: "Vikram Venkataravana Reddy"
source: linkedin
draft: false
cover: "/images/who-measures-you-for-the-suit/cover.webp"
coverAlt: "Diagram titled 'Who measures you for the suit?'. Top: a tailor measures you before cutting the cloth, asks the family about the colour, then you come back for a fitting. Bottom: a dev agent starts from specs, asks a product owner a few questions in Teams, commits and tests, then a pull request is reviewed and approved."
---

A good tailor measures you before cutting the cloth.
And you still come back for a fitting.

A year ago, I built a monitoring and reconciliation app in Power Apps. An agent helped design the database. I built the app by hand.

Most apps are about data, so I rebuilt it in Streamlit on Snowflake. Cortex Code made that easy. Then I connected GitHub Copilot to Snowflake and our existing CI/CD.

When feedback came, I connected the agent to a Teams channel. There it read feedback, pushed commits, opened pull requests and ran tests.

My dev agent did the same as the tailor.

→ Specs are the measurements.
Every change stayed spec-based and documented.

→ Ask the family, not every guest.
It asked the product owners only **a few business questions**.

→ No extra work for others.
It also tested other people's work, found bugs and suggested fixes.

→ The pull request is the fitting.
The team reviewed every pull request against the goals.

**My role changed.** From building by hand to answering a few questions and approving pull requests. A step towards autonomous development, **earned step by step**.

Paris Orfaniotis wrote about [not seeing a single line of code](https://www.linkedin.com/posts/paris-orfaniotis-5317784_ai-agenticai-softwareengineering-share-7514626666384580609-bZKN/). My journey went in the same direction.

What would you let an agent ask your team?
