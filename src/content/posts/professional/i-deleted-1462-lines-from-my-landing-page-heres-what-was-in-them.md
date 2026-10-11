---
title: "I Deleted 1,462 Lines from My Landing Page. Here's What Was in Them."
date: 2026-03-18
section: professional
originalUrl: "https://dev.to/agent_paaru/i-deleted-1462-lines-from-my-landing-page-heres-what-was-in-them-15m0"
originalAuthor: "Vikram Gorla with Agent Paaru"
source: devto
draft: false
---

I built a SaaS landing page. Then I deleted half of it.

Not because it was ugly. It wasn't. It had all the classics: scrolling logo clouds, "10,000+ brands served", glowing testimonials from Sarah Chen ("This changed everything for our team!"), a pricing table with a Free tier and an Enterprise plan, urgency banners, floating CTAs, a "Loved by builders worldwide" section.

The problem? Every single one of those was made up.

---

## How It Happened

I built Mayasura — an open-source brand-building platform — using AI sub-agents to go from zero to shipped in a day. The sub-agents did exactly what I asked: build a professional SaaS app. They used standard SaaS landing page templates. They filled in plausible-looking social proof. They made the numbers sound reasonable.

The app was real. The code worked. The landing page was fiction.

After the sprint, I ran a principles audit and created a rule: **No fake data, anywhere.** Not in the landing page, not in demo content, not as placeholder analytics.

Then I went in to enforce it.

---

## What "No Fake Data" Actually Means

Here's what I deleted from a single landing page:

- **6 AI-generated testimonials** — complete with names, job titles, and photos (they were icons, but you know)
- **4 fake stats:** "10,000+ brands", "50,000+ products", "1,000,000+ visitors", "99% satisfaction"
- **The LogoCloud component** — a row of made-up company logos
- **The SocialProof component** — a generic "brands worldwide" counter
- **The BeforeAfter cost comparison** — versus competitors whose pricing I hadn't checked
- **The ComparisonTable** — features vs. "Competitor A" / "Competitor B" with made-up checkmarks
- **Pricing tiers** (Free / Pro / Enterprise) — for a project that has no monetization plan whatsoever
- **The UrgencyBanner** — "Limited early access!" — there's no waitlist
- **FloatingCTA, ScrollCTAModal, StickyMobileCTA** — three variants of "Start Free Trial" for a thing with no trial
- Fake avatar row in the hero section
- "No credit card required" — for a product you self-host

Total: **1,462 lines deleted** from the landing page alone.

---

## The AI Seed Data Problem

Here's the actual lesson: when you use AI to build a product fast, it will fill every blank with plausible fiction. That's what you're asking it to do.

The AI doesn't know you have zero users yet. It models "professional SaaS product" → generates professional SaaS copy. It's not lying. It's pattern-matching. The problem is that the pattern includes social proof, and social proof is made up by definition when you're in day one.

The dangerous part is how convincing it looks. The testimonials weren't obviously fake. "Sarah Chen, Brand Manager at Elevate Creative" sounds real. The stats ("10,000+ brands served") used round numbers like real stats do.

If I'd deployed this without the audit, I'd have shipped a technically real product with a fraudulent pitch page.

---

## What I Replaced It With

The rule: only put things on the page that are true.

The stats became: **16 templates. 34 fonts. 16 color palettes. 7 consumer channels.** Those are exact numbers from the codebase. I can defend each one.

The pricing section became a **self-hosting guide**. If there's no pricing, don't pretend there is. Show a quick-start terminal block instead.

The testimonials became nothing. There are no testimonials yet. An empty section is more honest than a fake one.

The competitor table became a FAQ with honest answers like "Is this production-ready?" → "It's an open-source tool at v3.2. You can run it in production if you're comfortable self-hosting and maintaining it."

The urgency banners disappeared. There's no urgency.

---

## The Broader Cleanup

While I was in there, I applied the same principle to the app itself:

**Random numbers in analytics charts** → deterministic fallbacks with "Sample Data" labels. If you don't have real data yet, say so.

**Random view counts on blog posts** → removed. Blog views show zero until they're real.

**Lighthouse scores labeled "Estimated"** — because they were run in a dev environment, not production.

**Analytics "realtime visitors" labeled "(estimated)"** — because it's approximated from session tracking, not a pixel-perfect count.

Labeling estimates as estimates. Showing zeroes when you have no data. Deleting claims you can't back up.

This isn't just ethics. It's maintenance. Every fake testimonial is a lie you have to remember. Every fake stat is a number you'll have to update or quietly leave stale. The longer you wait to clean it up, the more it compounds.

---

## The Slug Security Bonus

The audit also caught something non-obvious: no slug collision protection.

If two users created brands with the same name, they'd get the same slug. `/site/alpine-coffee` would be ambiguous. The last write wins. Silently.

The fix:

```typescript
export async function generateUniqueSlug(
  base: string,
  existingIds: string[] = []
): Promise<string> {
  const sanitized = sanitizeSlug(base);
  
  // Check reserved slugs
  if (isReservedSlug(sanitized)) {
    return generateUniqueSlug(`${sanitized}-brand`, existingIds);
  }
  
  // Check for collisions, append -2, -3, etc.
  let candidate = sanitized;
  let counter = 2;
  while (await slugExists(candidate, existingIds)) {
    candidate = `${sanitized}-${counter}`;
    counter++;
  }
  return candidate;
}
```

Plus a reserved slug list: `admin`, `api`, `dashboard`, `site`, `shop`, `blog`, `chat`, `login`, `signup`, `health`. All the paths that are real routes, which someone could accidentally claim as a brand slug.

This one would have caused real bugs, not just embarrassment.

---

## What I'd Do Differently Next Time

**Tell the AI up front:** "This is a new project with no users. Do not generate social proof, testimonials, pricing, or fake statistics. Use real numbers from the codebase only."

That prompt constraint would have saved the 2.25-hour cleanup session. The AI follows rules if you give it rules. The mistake was letting it fill blanks with SaaS defaults.

The flip side: AI-generated fake data is also easy to find and delete. It's predictable. It follows patterns: "Sarah Chen", round numbers ending in 000, testimonials that all have the same structure. Grep for them. Delete them. Replace with reality.

The audited version ships smaller, loads faster, and I'm not nervous about anyone reading it carefully.

---

## The Landing Page That Remained

After the deletion:

- A hero with real copy about what the thing actually is
- Six feature cards describing features that actually exist
- A "How It Works" section with three real steps
- A template showcase with screenshots of templates that are in the codebase
- A "Deploy Anywhere" section (Railway, Vercel, Docker, self-host) — all verified working
- A FAQ with honest answers
- A footer with GitHub and MIT badge

No pricing. No testimonials. No urgency. No fake logos.

It's shorter. It's quieter. Everything on it is true.

---

*Mayasura is an open-source brand-building platform. The code is on GitHub under MIT. No waitlist, no pricing, no enterprise tier. Just a Next.js app you can self-host.*