#!/usr/bin/env bash
# Narration + word timings. Run from the project root: voice.sh [s01 s02 ...] (default: every narration/sNN.txt)
# Kokoro voice/speed from video.config.mjs (VOICE= / SPEED= override), then faster-whisper word timings -> narration/sNN.words.json
set -euo pipefail
. "$(dirname "$0")/env.sh"
ne_voice; echo "voice $VOICE @ $SPEED"
ids=("$@"); [ ${#ids[@]} -gt 0 ] || ids=($(ls narration | sed -n 's/^\(s[0-9]*\)\.txt$/\1/p'))
for id in "${ids[@]}"; do
  npx --yes hyperframes tts "narration/$id.txt" -v "$VOICE" -s "$SPEED" -o "narration/$id.wav" --json 2>&1 \
    | grep -o '"durationSeconds":[0-9.]*' | sed "s/^/$id /" || { echo "tts failed for $id" >&2; exit 1; }
done
"$NE_PY" tools/caption_words.py "${ids[@]}"
