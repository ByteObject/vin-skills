#!/usr/bin/env bash
# One-time (idempotent) setup: Python venv for Kokoro TTS + faster-whisper + font subsetting,
# and the Traditional Chinese caption font. Everything lives in ~/.cache/narrated-explainer.
set -euo pipefail
. "$(dirname "$0")/env.sh"
for tool in node npx ffmpeg ffprobe uv; do command -v $tool >/dev/null || { echo "missing: $tool" >&2; exit 1; }; done
mkdir -p "$NE_CACHE/fonts"
if [ ! -x "$NE_PY" ]; then
  uv venv --python 3.12 "$NE_VENV"
  . "$(dirname "$0")/env.sh"
fi
if ! "$NE_PY" -c "import kokoro_onnx, soundfile, numpy, faster_whisper, fontTools, brotli" 2>/dev/null; then
  uv pip install --python "$NE_PY" kokoro-onnx soundfile numpy faster-whisper fonttools brotli
fi
if [ ! -s "$NE_ZH_FONT" ]; then
  url=$(curl -s https://api.github.com/repos/lxgw/LxgwWenkaiTC/releases/latest | grep -o '"browser_download_url": *"[^"]*/LXGWWenKaiTC-Medium.ttf"' | sed 's/.*"\(http[^"]*\)"/\1/')
  [ -n "$url" ] || { echo "could not find LXGWWenKaiTC-Medium.ttf in the latest release" >&2; exit 1; }
  curl -sL -o "$NE_ZH_FONT" "$url"
fi
"$NE_PY" -c "import kokoro_onnx, soundfile, numpy, faster_whisper, fontTools; print('python env ok')"
ls -la "$NE_ZH_FONT"
