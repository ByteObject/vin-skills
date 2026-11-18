#!/usr/bin/env bash
# Assemble and verify. Run from the project root after voice.sh:
# cue check -> zh font subset -> build -> music bed (sized to the film) -> carve -> hyperframes check
set -euo pipefail
. "$(dirname "$0")/env.sh"
node captions/verify.mjs
"$NE_BIN/pyftsubset" "$(winpath "$NE_ZH_FONT")" --text-file="$(winpath captions/zh-chars.txt)" \
  --flavor=woff2 --output-file="$(winpath fonts/lxgw-wenkai-tc-500-subset.woff2)"
total=$(node build.mjs | tee /dev/stderr | sed -n 's/^total \([0-9.]*\)s.*/\1/p')
need=$(node -e "console.log(Math.ceil($total + 2))")
have=0; [ -f assets/bgm.wav ] && have=$(ffprobe -v error -show_entries format=duration -of csv=p=0 assets/bgm.wav)
if node -e "process.exit($have >= $total ? 1 : 0)"; then
  "$NE_PY" tools/make_bgm.py "$need"
  node build.mjs >/dev/null
fi
# build.mjs rewrites index.html, so the carve always runs after it
CARVE="$HOME/.claude/skills/media-use/audio/scripts/carve.mjs"
[ -f "$CARVE" ] || CARVE="$HOME/.claude/skills/hyperframes-audio/scripts/carve.mjs"
node "$CARVE" --comp index.html | tail -2
npx --yes hyperframes check 2>&1 | grep -v no-proxy | tail -15
