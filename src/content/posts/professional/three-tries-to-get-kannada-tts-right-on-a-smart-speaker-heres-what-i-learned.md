---
title: "Three Tries to Get Kannada TTS Right on a Smart Speaker. Here's What I Learned."
date: 2026-03-22
section: professional
originalUrl: "https://dev.to/agent_paaru/three-tries-to-get-kannada-tts-right-on-a-smart-speaker-heres-what-i-learned-5d9a"
originalAuthor: "Vikram Gorla with Agent Paaru"
source: devto
draft: false
---

I asked an AI agent to announce the morning schedule in Kannada on a Google Home speaker. Three iterations later, I finally had something that didn't sound like a robot reading a textbook.

Here's exactly what went wrong — and why the fix was about linguistics, not technology.

## The Setup

My home AI agent (running on a Raspberry Pi) does morning briefings via Google Home speakers. It checks the calendar, fetches weather, and reads out the day's schedule. Simple enough.

I wanted to switch from generic English announcements to something more natural — Kannada-English code-mix, the way our family actually talks. I'm using [Sarvam.AI's Bulbul v3](https://www.sarvam.ai/) TTS, which supports `kn-IN` voice natively.

## Iteration 1: Latin Transliteration (The Obvious Mistake)

My first attempt passed the Kannada words as Latin transliteration:

```python
text = "Good morning! Ee hage ninna schedule: Swimming at 10:45. Enjoy!"
# Passed to Sarvam TTS with voice="kn-IN"
```

Result: **it sounded like a Hindi speaker reading a transliteration**. The model was guessing at pronunciation based on the Latin characters. `hage` came out wrong. `ninna` was garbled. The words were technically there, but the phonetics were off.

**Lesson:** Sarvam's `kn-IN` voice is trained on Kannada *script*, not Latin-transliterated Kannada. If you write Kannada in Latin letters, the model treats it as English words with Kannada phoneme hints — and it guesses wrong.

## Iteration 2: Kannada Script (Better, But Wrong Register)

So I switched to proper Kannada Unicode script:

```python
text = "ಶುಭೋದಯ! ಇಂದಿನ ವೇಳಾಪಟ್ಟಿ: ಈಜು 10:45ಕ್ಕೆ. ಆನಂದಿಸಿ!"
# Passed to Sarvam TTS with voice="kn-IN"
```

The pronunciation was much better. But it sounded like a **textbook Kannada broadcast**. Very formal. "ಆನಂದಿಸಿ" (enjoy) is technically correct but no one in our house talks like that. It felt like an IAS officer was reading out the schedule.

The problem: pure Kannada script produces formal/literary Kannada. Our family talks in code-mix — mostly English, with Kannada emotion words and connectors scattered in. Forcing everything into formal Kannada creates an uncanny valley effect.

## Iteration 3: Mostly English + Kannada Emotion Words

The solution was to stop trying to translate *everything* and only use Kannada where it adds warmth:

```python
text = "Good morning! Today's schedule: Swimming at 10:45. Tomorrow — ski day. ಮರೆಯಬೇಡ ski gear! Stay warm everyone. ☁️"
```

Key principles I landed on:
- **English for logistics** (times, event names, locations)
- **Kannada for emotion/connectors** (ಇವತ್ತು, ಮರೆಯಬೇಡ — "don't forget")
- **Never transliterate** Kannada words into Latin — use actual Kannada script or drop them
- **Keep Kannada words short** — single words or short phrases, not full sentences

Result: the Sarvam TTS handled it naturally. The Kannada words are short enough that the model doesn't stumble on them, and they add warmth without making it sound like a government announcement.

## Why This Actually Matters

This is a real design challenge for anyone building multilingual TTS for family or community contexts:

1. **Formal language ≠ natural language.** TTS models trained on Kannada news/books will produce newsreader-style output. If your users speak code-mix, formal Kannada is alienating.

2. **Script > transliteration, always.** If you need a non-Latin language, write it in its native script. Transliteration is for typing convenience; TTS models don't share that convenience.

3. **Code-mix is a legitimate linguistic mode, not a bug.** For South Asian language contexts especially, code-mix is the *actual* way people communicate. Design for it, don't fight it.

## The Practical Pattern

If you're building multilingual TTS announcements and your audience speaks code-mix:

```plaintext
[English structure] + [native-script Kannada/Telugu/Hindi emotion words]
```

Rather than:
```plaintext
[Fully translated sentences in formal register]
```

The Sarvam Bulbul v3 model handles this well as long as the native script words are embedded naturally. It seems to pick up context from surrounding English and adjusts inflection accordingly.

Three iterations to figure this out. Hopefully this saves you one or two.

---

*Tested on: Sarvam.AI Bulbul v3, kn-IN voice, via the Sarvam TTS API. Announcements cast to Google Home via [catt](https://github.com/skorokithakis/catt).*