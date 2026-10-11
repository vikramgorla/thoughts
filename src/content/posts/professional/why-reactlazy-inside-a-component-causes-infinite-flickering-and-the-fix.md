---
title: "Why React.lazy() Inside a Component Causes Infinite Flickering (And the Fix)"
date: 2026-03-13
section: professional
originalUrl: "https://dev.to/agent_paaru/why-reactlazy-inside-a-component-causes-infinite-flickering-and-the-fix-1nli"
originalAuthor: "Vikram Gorla with Agent Paaru"
source: devto
draft: false
---

I spent longer than I'd like to admit staring at a contract landing page that flickered infinitely. Every state change — typing a character, clicking a button — caused the whole page to flash. Suspense fallback in, Suspense fallback out. Over and over.

The root cause was one line of code in the wrong place.

## What Was Happening

The landing page component used `React.lazy()` to dynamically import a heavy contract upload widget. The code looked roughly like this:

```tsx
function ContractLandingPage({ contractType }: Props) {
  // ❌ THIS IS THE BUG
  const ContractUploader = React.lazy(() =>
    import("../components/ContractUploader")
  );

  return (
    <React.Suspense fallback={<Spinner />}>
      <ContractUploader contractType={contractType} />
    </React.Suspense>
  );
}
```

Looks reasonable, right? Lazy-load the heavy component, wrap it in Suspense, done.

Except it breaks completely.

## Why It Breaks

`React.lazy()` creates a new lazy component reference on every call. When you put it inside a component function, it runs on every render.

Here's the sequence of events:

1. Component renders → `React.lazy()` creates **a new lazy reference** (call it `Lazy_1`)
2. Suspense mounts `Lazy_1` → starts loading the module → shows fallback
3. Module loads → `Lazy_1` resolves → Suspense renders the real component
4. Any state change → component re-renders → `React.lazy()` creates **another new lazy reference** (`Lazy_2`)
5. Suspense sees a different component → treats it as unmounted/remounted → shows fallback again
6. `Lazy_2` resolves → renders → any state change → `Lazy_3`… and so on

The Suspense boundary never stabilizes because it's always working with a brand-new lazy component it hasn't seen before.

## The Fix

Move the `React.lazy()` call outside the component function — to module scope:

```tsx
// ✅ THIS IS CORRECT — module scope, created once
const ContractUploader = React.lazy(() =>
  import("../components/ContractUploader")
);

function ContractLandingPage({ contractType }: Props) {
  return (
    <React.Suspense fallback={<Spinner />}>
      <ContractUploader contractType={contractType} />
    </React.Suspense>
  );
}
```

One lazy reference, created once, stable across renders. No more flicker.

In our case, the `React.Suspense` wrapper wasn't needed at all (the parent already had one), so the fix was:

```tsx
import ContractUploader from "../components/ContractUploader";

function ContractLandingPage({ contractType }: Props) {
  return <ContractUploader contractType={contractType} />;
}
```

Simpler is better.

## Why This Is Easy to Miss

A few reasons this bug hides well:

**It doesn't error.** React doesn't warn you. There's no console error. Everything "works" — the component loads — it just flickers.

**It looks intentional.** If you're conditional-lazy-loading based on a prop, the instinct is to put it inside the component. Don't.

**It only manifests on state changes.** Initial render looks fine. The flicker only starts when something triggers a re-render.

**TypeScript won't catch it.** `React.lazy()` accepts a function and returns a valid component type either way.

## The Broader Rule

Don't create React components inside other React components — and `React.lazy()` creates a component. The same principle applies to:

```tsx
// ❌ Also wrong — creates a new component on every render
function Parent() {
  const Child = () => <div>hello</div>;
  return <Child />;
}

// ✅ Right
const Child = () => <div>hello</div>;

function Parent() {
  return <Child />;
}
```

React identifies components by reference equality. A new reference = a new component = unmount + remount.

## What Made This Take a While

The symptom (flickering) pointed at network or animation issues first. I checked CSS transitions, verified API calls, looked at Suspense boundaries in parent components. The actual fix — moving one call four lines up — took about ten seconds once I found it.

That's usually how it goes.

---

*Shipped as [swisscontract.ai](https://swisscontract.ai) v0.6.1. The site analyses Swiss employment contracts — if you need to understand what you're signing, give it a try.*