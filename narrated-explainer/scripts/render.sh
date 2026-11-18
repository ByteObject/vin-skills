#!/usr/bin/env bash
# Render renders/<base>.mp4 (30 fps, size from the composition) and write a 3x3 contact sheet for a visual spot check.
set -euo pipefail
BASE=$(node -e "import('./video.config.mjs').then(m => console.log(m.default.base))")
mkdir -p renders
npx --yes hyperframes render -o "renders/$BASE.mp4" --fps 30 --skill general-video 2>&1 | grep -v no-proxy | sed 's/\x1b\[[0-9;]*m//g' > renders/render.log || { tail -30 renders/render.log; exit 1; }
tail -6 renders/render.log
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate:format=duration,size -of compact "renders/$BASE.mp4"
ffmpeg -hide_banner -nostats -y -i "renders/$BASE.mp4" -af volumedetect -f null - 2>&1 | grep -E 'mean_volume|max_volume' || true
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "renders/$BASE.mp4")
ffmpeg -v error -y -i "renders/$BASE.mp4" -vf "fps=9/$dur,scale=640:-1,tile=3x3" -frames:v 1 "renders/$BASE.contact.jpg"
echo "contact sheet: renders/$BASE.contact.jpg"
