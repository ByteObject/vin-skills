#!/usr/bin/env bash
# Pronunciation check: say-test.sh "text to speak" -> plays nothing, prints what whisper hears.
# Use it on product names, acronyms and commands before writing the narration.
set -euo pipefail
. "$(dirname "$0")/env.sh"
ne_voice
OUT="${TMPDIR:-/tmp}/ne-say-test.wav"
npx --yes hyperframes tts "${1:?text}" -v "$VOICE" -s "$SPEED" -o "$OUT" --json >/dev/null 2>&1
"$NE_PY" - "$(winpath "$OUT")" <<'PY'
import sys, numpy as np, soundfile as sf
from faster_whisper import WhisperModel
d, r = sf.read(sys.argv[1], dtype="float32", always_2d=True); m = d.mean(axis=1)
n = int(len(m) * 16000 / r); a = np.interp(np.linspace(0, len(m) - 1, n), np.arange(len(m)), m).astype(np.float32)
segs, _ = WhisperModel("base.en", device="cpu", compute_type="int8").transcribe(a, language="en")
print("heard:", " ".join(s.text.strip() for s in segs))
PY
echo "audio: $OUT"
