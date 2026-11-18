#!/usr/bin/env bash
# Scaffold a narrated explainer: new-project.sh <project-dir> [output-base-name] [notebook|short]
# notebook (A): 1920x1080 hand-drawn notebook   short (B): 1080x1920 vertical card short
set -euo pipefail
. "$(dirname "$0")/env.sh"
DIR="${1:?usage: new-project.sh <project-dir> [base] [notebook|short]}"
BASE="${2:-$(basename "$DIR")}"
TPL="${3:-notebook}"
case "$TPL" in A|a) TPL=notebook ;; B|b) TPL=short ;; esac
[ -d "$SKILL_DIR/templates/$TPL" ] || { echo "unknown template: $TPL (use notebook or short)" >&2; exit 1; }
if [ ! -f "$DIR/hyperframes.json" ]; then
  npx --yes hyperframes init "$DIR" --non-interactive --example=blank --skill=general-video
fi
cd "$DIR"
# copy the shared files and the template without overwriting anything the project already has
cp -rn "$SKILL_DIR/common/." .
cp -rn "$SKILL_DIR/templates/$TPL/." .
sed -i "s/base: 'my-\(explainer\|short\)'/base: '$BASE'/" video.config.mjs
mkdir -p assets renders compositions
if [ "$TPL" = notebook ]; then
  [ -f compositions/hw-scribble-transition.html ] || npx --yes hyperframes add hw-scribble-transition
fi
# carve.mjs (hyperframes-audio) imports @hyperframes/core
[ -d node_modules/@hyperframes/core ] || npm i -D @hyperframes/core --no-audit --no-fund
echo "project ready: $(pwd)  (template: $TPL, base: $BASE)"
