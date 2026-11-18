"""Word-level timing for each narration clip.

Transcribes narration/sNN.wav with faster-whisper, aligns the recognized words to the
script in narration/sNN.txt (the script wording wins), merges TTS spellings back into
code terms ("perform Unit Of Work" -> "performUnitOfWork") and writes narration/sNN.words.json.
"""
import json
import re
import sys
from difflib import SequenceMatcher
from pathlib import Path

import numpy as np
import soundfile as sf
from faster_whisper import WhisperModel

NARRATION = Path(__file__).resolve().parent.parent / "narration"

# spoken (as written for TTS) -> displayed in captions
PHRASES = []  # display forms come from captions/cues.mjs

def load_16k(path):
    """Mono float32 at 16 kHz (decoded here to avoid faster-whisper's PyAV path)."""
    data, rate = sf.read(str(path), dtype="float32", always_2d=True)
    mono = data.mean(axis=1)
    n = int(len(mono) * 16000 / rate)
    return np.interp(np.linspace(0, len(mono) - 1, n), np.arange(len(mono)), mono).astype(np.float32)


norm = lambda w: re.sub(r"[^a-z0-9]", "", w.lower())


def align(script_tokens, words):
    s = [norm(t) for t in script_tokens]
    w = [norm(x["word"]) for x in words]
    times = [None] * len(s)
    sm = SequenceMatcher(None, s, w, autojunk=False)
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op in ("equal", "replace") and j2 > j1:
            n = i2 - i1
            if n == j2 - j1:  # one-to-one
                for k in range(n):
                    times[i1 + k] = [words[j1 + k]["start"], words[j1 + k]["end"]]
            else:  # spread the recognized span evenly over the script tokens
                start, end = words[j1]["start"], words[j2 - 1]["end"]
                for k in range(n):
                    times[i1 + k] = [start + (end - start) * k / n, start + (end - start) * (k + 1) / n]
    # interpolate script tokens whisper skipped
    for i, t in enumerate(times):
        if t is None:
            prev_end = next((times[k][1] for k in range(i - 1, -1, -1) if times[k]), 0.0)
            nxt = next((times[k][0] for k in range(i + 1, len(times)) if times[k]), prev_end + 0.3)
            times[i] = [prev_end, max(prev_end + 0.05, nxt)]
    return times


def merge_phrases(tokens, times):
    out = []
    i = 0
    keys = [(p.split(), d) for p, d in PHRASES]
    while i < len(tokens):
        for parts, display in keys:
            seg = tokens[i : i + len(parts)]
            if len(seg) == len(parts) and all(norm(a) == norm(b) for a, b in zip(seg, parts)):
                trail = re.search(r"[^\w]*$", seg[-1]).group(0)
                lead = re.match(r"^[^\w$]*", seg[0]).group(0)
                out.append({"text": lead + display + trail, "start": times[i][0], "end": times[i + len(parts) - 1][1]})
                i += len(parts)
                break
        else:
            out.append({"text": tokens[i], "start": times[i][0], "end": times[i][1]})
            i += 1
    return out


def main():
    model = WhisperModel("base.en", device="cpu", compute_type="int8")
    ids = sys.argv[1:] or sorted(p.stem for p in NARRATION.glob("*.wav"))
    for sid in ids:
        script = (NARRATION / f"{sid}.txt").read_text(encoding="utf8").strip()
        audio = load_16k(NARRATION / f"{sid}.wav")
        segments, _ = model.transcribe(audio, word_timestamps=True, initial_prompt=script, language="en")
        words = [{"word": w.word, "start": w.start, "end": w.end} for seg in segments for w in seg.words]
        tokens = script.split()
        if len(words) < 0.85 * len(tokens):  # the text prompt occasionally makes whisper skip a sentence
            segments, _ = model.transcribe(audio, word_timestamps=True, language="en")
            words = [{"word": w.word, "start": w.start, "end": w.end} for seg in segments for w in seg.words]
        merged = merge_phrases(tokens, align(tokens, words))
        (NARRATION / f"{sid}.words.json").write_text(json.dumps(merged, indent=1), encoding="utf8")
        print(f"{sid}: {len(tokens)} script tokens, {len(words)} recognized, {len(merged)} caption tokens")


if __name__ == "__main__":
    main()
