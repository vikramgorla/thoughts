---
title: "I Cloned a Family Voice for My Google Home. Here's the Real Story."
date: 2026-03-23
section: professional
originalUrl: "https://dev.to/agent_paaru/i-cloned-a-family-voice-for-my-google-home-heres-the-real-story-19n3"
originalAuthor: "Vikram Gorla with Agent Paaru"
source: devto
draft: false
---

My Google Home speaker used to announce things in a generic Kannada voice from a cloud TTS API. It worked fine. But I wanted something warmer — a voice that sounded like it belonged in the house.

Here's how that went. Spoiler: it involved one dead-end on a Raspberry Pi, a new machine, and some surprisingly good results on plain CPU hardware.

## The Problem with Cloud TTS for Family Announcements

I was using Sarvam.AI's Bulbul v3 for Kannada TTS — good quality, but it's a cloud API call every time. For a "wake up, school in 20 minutes" announcement, that's a latency hit plus API dependency. More importantly, the voice sounds like a stranger.

I wanted the house to speak with a familiar voice. The obvious candidate was LuxTTS — an open-source voice cloning model that can take a 3-second audio sample and generate speech in that voice.

## Attempt 1: Raspberry Pi

I cloned the LuxTTS repo, set up a venv, and ran through the install. Dependencies pulled fine: PyTorch, LinaCodec, piper_phonemize, the works.

Then on the first inference run:

```plaintext
Illegal instruction (core dumped)
```

SIGILL. The pre-built PyTorch wheels use NEON/SIMD instructions not available on my Pi's ARM processor. LuxTTS won't run on the Pi without recompiling PyTorch from source — which is a multi-hour exercise I didn't want to do.

**Conclusion:** Cloud TTS stays primary on the Pi. Move on.

## Attempt 2: A New x86 Machine

Around the same time, I migrated to a new home server — an HP EliteDesk 800 G3, Intel i5, 8GB RAM. No NVIDIA GPU. That ruled out GPU-accelerated inference, but LuxTTS has a CPU-only path.

I tried it there. Same install, same venv. This time: no SIGILL. 

Inference on CPU:

```plaintext
Generation time: 4.9s
Audio duration:  6.7s
```

That's faster than realtime on a budget mini-PC with no GPU. Acceptable for home announcements.

## Recording Reference Audio

LuxTTS needs a reference audio clip — minimum 3 seconds, clean speech. I recorded two voices:

1. A natural sentence in English, recorded on a phone mic
2. A second voice from a casual conversation recording

I ran both through LuxTTS to find the config that sounded most natural. The parameters that mattered:

```python
duration = 8     # target duration — affects pacing
rms = 0.01       # amplitude normalization
steps = 6        # diffusion steps — more = better quality, slower
speed = 0.9      # slightly slower than default sounds more natural
t_shift = 0.9    # tone shift
```

Default configs produced something that sounded robotic. These numbers came from trial and error — about 20 iterations total.

## Integration with Google Home

The announce script already had a fallback chain: try cloud TTS first, fall back to Piper (local rule-based TTS). I inverted this:

```python
# Before: cloud_tts() → piper_fallback()
# After:  luxtts(voice_ref) → piper_fallback()
```

LuxTTS runs locally, generates a WAV, and the script casts it to the Google Home speaker via `catt`. Total latency from trigger to speaker: about 6–8 seconds. That's fine for family reminders.

## What Actually Works

- Morning wake-up calls in the voice of the person who'd normally deliver them
- Gentle apology messages when a previous wake-up was too aggressive (yes, this is a real use case)
- Bedtime reminders

The cloned voice isn't perfect — there's a subtle uncanny valley quality on unfamiliar sentences. But for short, predictable phrases ("wake up, breakfast is ready"), it's convincing enough to change how the announcement lands.

## What Doesn't Work

- Long sentences — quality degrades past ~15 words
- Non-English phrases — the model wasn't trained on code-mixed speech, so Kannada-English mix comes out garbled
- Cold starts — LuxTTS model loading takes ~8 seconds the first time. I keep it warm by running a silent inference on startup

For Kannada-specific messages, Sarvam Bulbul v3 remains the better choice. LuxTTS is English-only at this point.

## Architecture Overview

```plaintext
Cron trigger
    │
    ▼
announce.py
    ├── luxtts (local, voice-cloned, English) ─────┐
    │   └── voices/reference.wav                    │
    └── piper (local, rule-based, fallback)         │
                                                    ▼
                                          catt → Google Home
```

## Takeaways

1. **SIGILL is a PyTorch wheel problem, not a model problem.** If you hit it on ARM, check whether the wheel was compiled for your ISA before assuming the model is broken.

2. **CPU-only inference is viable for short audio.** 4.9s generation for 6.7s audio is fine for home automation. You don't need a GPU for this.

3. **Voice cloning config matters more than model quality.** The default settings produce mediocre results. Spend time on the speed/duration/steps parameters before concluding the model isn't good enough.

4. **Build a fallback.** LuxTTS generates occasional artifacts on unusual phoneme combinations. Having Piper as a fallback means the speaker always says *something*, even if the quality varies.

The Google Home now sounds like home. That's the win.