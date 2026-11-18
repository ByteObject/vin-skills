"""Synthesize a soft ambient piano/pad bed: assets/bgm.wav.

Usage: python tools/make_bgm.py <seconds>
Deterministic (fixed seed). Slow I-vi-IV-V-ish progression in D, warm pads plus sparse
felt-piano notes, a long synthetic reverb tail, and a gentle low-pass.
"""
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

SR = 44100
OUT = Path(__file__).resolve().parent.parent / "assets" / "bgm.wav"
CHORD_LEN = 8.0

# MIDI notes per chord (pad voicing) and the arpeggio pool for piano notes
CHORDS = [
    ([50, 57, 62, 66, 69, 76], [74, 76, 78, 81]),  # Dmaj9
    ([47, 54, 59, 62, 66, 69], [71, 74, 78, 81]),  # Bm7
    ([43, 50, 55, 59, 62, 66], [71, 74, 76, 79]),  # Gmaj7
    ([45, 52, 57, 61, 64, 71], [69, 73, 76, 81]),  # A6/9
]


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def lowpass(x, cutoff):
    spec = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(len(x), 1 / SR)
    spec *= 1 / np.sqrt(1 + (freqs / cutoff) ** 4)  # 2nd-order-ish rolloff
    return np.fft.irfft(spec, len(x))


def pad(notes, n):
    t = np.arange(n) / SR
    env = np.minimum(1, t / 2.5) * np.minimum(1, (n / SR - t) / 2.5)
    out = np.zeros(n)
    for k, m in enumerate(notes):
        f = hz(m)
        for det in (-0.12, 0.12):
            ff = f * 2 ** (det / 12)
            out += np.sin(2 * np.pi * ff * t + k) * (0.5 if m < 52 else 0.32)
            out += 0.08 * np.sin(4 * np.pi * ff * t)
    lfo = 0.85 + 0.15 * np.sin(2 * np.pi * 0.07 * t)
    return out * env * lfo


def piano(m, n):
    t = np.arange(n) / SR
    f = hz(m)
    env = np.exp(-t * 1.6) * np.minimum(1, t / 0.008)
    tone = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) * np.exp(-t * 3) + 0.12 * np.sin(6 * np.pi * f * t) * np.exp(-t * 5)
    return tone * env


def reverb(x, rng, seconds=3.2):
    n = int(SR * seconds)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR * 2.2)
    ir[0] = 0
    size = 1 << int(np.ceil(np.log2(len(x) + n)))
    wet = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x)]
    return wet / (np.max(np.abs(wet)) + 1e-9)


def main():
    seconds = float(sys.argv[1]) if len(sys.argv) > 1 else 240.0
    rng = np.random.default_rng(7)
    total = int(SR * (seconds + 4))
    dry = np.zeros(total)
    cl = int(SR * CHORD_LEN)
    i = 0
    while i * cl < total:
        notes, pool = CHORDS[i % len(CHORDS)]
        start = i * cl
        n = min(cl + SR * 2, total - start)
        dry[start : start + n] += 0.05 * pad(notes, n)
        for beat in range(4):  # one soft piano note every two seconds, sometimes skipped
            if rng.random() < 0.25:
                continue
            s = start + int(SR * (beat * 2.0 + rng.uniform(0, 0.15)))
            m = int(pool[rng.integers(len(pool))])
            pn = min(int(SR * 4), total - s)
            if pn > 0:
                dry[s : s + pn] += 0.11 * piano(m, pn) * rng.uniform(0.7, 1.0)
        i += 1
    wet = reverb(dry, rng)
    mix = 0.6 * dry / (np.max(np.abs(dry)) + 1e-9) + 0.55 * wet
    mix = lowpass(mix, 3200)
    mix = mix[: int(SR * seconds)]
    fade = int(SR * 3)
    mix[:fade] *= np.linspace(0, 1, fade)
    mix[-fade:] *= np.linspace(1, 0, fade)
    mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.5
    # slight stereo width from a short delay on the right channel
    d = int(SR * 0.012)
    right = np.concatenate([np.zeros(d), mix[:-d]])
    OUT.parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(OUT), np.stack([mix, right], axis=1).astype(np.float32), SR, subtype="PCM_16")
    print(f"wrote {OUT} ({seconds:.1f}s)")


if __name__ == "__main__":
    main()
