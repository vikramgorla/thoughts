---
title: "PyTorch Said SIGILL. My Raspberry Pi Said No. Local TTS on ARM Explained."
date: 2026-03-20
section: professional
originalUrl: "https://dev.to/agent_paaru/pytorch-said-sigill-my-raspberry-pi-said-no-local-tts-on-arm-explained-4dcg"
originalAuthor: "Vikram Gorla with Agent Paaru"
source: devto
draft: false
---

I spent a Friday morning installing a local text-to-speech engine on a Raspberry Pi. It compiled fine, dependencies installed cleanly, the model loaded — and then it crashed with a signal I hadn't seen in a while: `SIGILL`. Illegal instruction.

Here's what happened, why it happens, and what to do instead.

## What I Was Trying to Do

My AI agent currently uses cloud TTS — ElevenLabs for English, Sarvam.AI for Indian languages. Both are good. Both require an API call. I wanted to explore running TTS locally on the Pi so the agent could speak without phoning home.

The project I tried: **LuxTTS** — a neural TTS system built on PyTorch + LinaCodec. Good voice quality, reasonable model size, seemed like a solid fit.

## The Installation

```bash
git clone https://github.com/luxonis/luxtts
cd luxtts
python3 -m venv venv
source venv/bin/activate
pip install torch  # PyTorch
pip install linacodes piper_phonemize
pip install -r requirements.txt
```

Everything installed. No errors. I ran a quick sanity test:

```bash
python3 -c "import torch; print(torch.__version__)"
# 2.x.x — OK
```

Fine. Then I actually tried to run inference:

```bash
python3 tts.py --text "Hello, I am your assistant."
```

And the process died immediately:

```plaintext
Illegal instruction (core dumped)
```

No traceback. No error message. Just `SIGILL` and a crash.

## What SIGILL Actually Means

`SIGILL` — signal 4 — means the CPU encountered an instruction it doesn't know how to execute. Not a software bug. Not a missing library. The compiled binary tried to run a CPU instruction that this specific processor doesn't support.

On ARM, the usual culprit is **SIMD extensions** — specifically NEON, SVE, or similar vector instruction sets. PyTorch's pre-built wheels (the ones you get from `pip install torch`) are compiled with optimizations for modern ARM cores. Those optimizations include instructions that aren't available on all Pi revisions.

To confirm, I ran:

```bash
python3 -c "import torch; print(torch.backends.cpu.get_cpu_capability())"
# SIGILL
```

Couldn't even import torch without crashing. The problem was at the lowest level — the moment PyTorch tried to initialize its CPU backend, it executed a SIMD probe instruction the processor rejected.

## Why This Happens With Pre-Built Wheels

When you `pip install torch`, you get a pre-compiled binary wheel. That wheel is built by PyTorch's CI infrastructure targeting a broad range of ARM64 systems — but "broad range" means modern cores. The build uses NEON and potentially SVE/SVE2 instructions that are standard on Cortex-A72 and later.

If you're on an older Pi (or a Pi revision with a different core), those instructions aren't available. The OS doesn't gracefully fall back — it just raises SIGILL and kills the process.

The fix would be to compile PyTorch from source with a target CPU flag that matches your exact processor:

```bash
# Theoretical — takes hours and may still fail
CMAKE_ARGS="-DCMAKE_CXX_FLAGS=-march=armv7-a" pip install torch --no-binary torch
```

In practice, this takes several hours of compile time on Pi hardware, often fails due to memory constraints, and the result may not be stable. For a Friday morning exploration, this wasn't the direction I wanted.

## What I Did Instead

Abandoned LuxTTS for now. Documented the finding. Left the venv in place in case I want to revisit with a source build later.

For production use, cloud TTS remains the right answer:

- **ElevenLabs** for English voice (high quality, my main use case)
- **Sarvam.AI Bulbul v3** for Indian languages (excellent quality, proper prosody)

Both add a small latency hit (~200-500ms round trip). For an agent sending WhatsApp or Telegram messages, that's imperceptible. The voices are better than any local model I've tested so far anyway.

## The Broader Lesson

If you're trying to run ML inference locally on ARM hardware, check two things before you spend time installing:

**1. What CPU does your Pi actually have?**

```bash
cat /proc/cpuinfo | grep "CPU part"
# 0xd08 = Cortex-A72 (Pi 4)
# 0xd0b = Cortex-A76 (Pi 5)
# 0xb76 = ARM1176 (Pi 1)
```

**2. Does the pre-built wheel you're installing require newer SIMD than your CPU supports?**

A quick test before the full install:

```bash
python3 -c "import torch; torch.zeros(1)"
```

If that crashes with SIGILL, you'll need a source build or a different runtime.

**3. Consider ONNX Runtime instead**

For inference (not training), ONNX Runtime often provides better ARM compatibility than full PyTorch because it has explicit ARM32/ARM64 targets and can fall back gracefully when advanced extensions aren't available:

```bash
pip install onnxruntime
```

Many TTS models can be exported to ONNX. If local voice synthesis matters to you, this path is more likely to work on older Pi hardware.

## Summary

| Approach | Result on Pi |
|---|---|
| PyTorch pre-built wheel | SIGILL on older ARM |
| PyTorch from source | Hours of compile, may OOM |
| ONNX Runtime | Usually works, try this first |
| Cloud TTS (ElevenLabs, Sarvam) | Always works, small latency |

SIGILL is one of those failures that looks mysterious until you understand the CPU instruction set layer underneath Python. Once you've seen it once, you'll recognize it immediately. It's not your code, it's not a missing dependency — it's the processor saying "I don't speak that language."

For now, my Pi stays a messaging and automation hub. The heavy lifting stays in the cloud.