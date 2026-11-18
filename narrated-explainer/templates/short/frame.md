---
name: vertical-card-short
canvas: 1080x1920
colors:
  paper: "#F3F3EE"
  rule: "#E3E3DC"
  dot: "#D2D2CB"
  ink: "#141414"
  soft: "#8C8C86"
  card: "#FFFFFF"
  gray-card: "#D5D5CF"
  green: "#09544B"
  mint: "#DDEFE8"
  light: "#EEF4F1"
  red: "#C8402E"
  caption-pill: "#3A3A3A"
  caption-zh: "#F2E7B8"
typography:
  display: { family: "Noto Sans", weight: 800, file: "fonts/noto-sans-latin-vf.woff2", sizes: "56–110px" }
  body: { family: "Noto Sans", weight: 500–800, sizes: "32–52px" }
  mono: { family: "JetBrains Mono", weight: 400, file: "fonts/jetbrains-mono-400.woff2", sizes: "26–60px" }
  caption-en: { family: "Noto Sans", weight: 800, sizes: "50px" }
  caption-zh: { family: "LXGW WenKai TC", weight: 500, file: "fonts/lxgw-wenkai-tc-500-subset.woff2", sizes: "42px" }
zones:
  watermark-top: "y 118–160 (top-right / top-left corner)"
  header: "y 196–275 (chapter k/n + name, segmented progress bar)"
  content: "x 60–1020, y 330–1390"
  caption-pill: "y 1398–1540, centred"
  avatar: "x 18–378, y 1545–1920"
  watermark-bottom: "right side, y 1800"
components:
  card: "white, 4px ink border, 18px radius (lib CARD); kinds dark / gray / dash / line"
  stat-card: "big 100–110px number with count-up + soft caption (lib STAT)"
  stamp: "rotated −5..−8°, 6px border, green or red, 900 weight (lib STAMP)"
  tag: "mono pill, 3px border; inv / mint kinds (lib TAG)"
  frame: "real screenshot in a 7–14px ink frame, rounded (lib FRAME)"
  connector: "ink line drawn on (lib LINE + HEAD inside SVG)"
  strike: "red bar across a wrong option (lib STRIKE)"
  source: "mono soft line 'Source: … · as of <date>' under any number (lib SRC)"
---

## Overview

A vertical explainer short for Threads / Reels / Shorts. Ruled paper with a dotted
margin, or deep green for the hook, the payoff line and the close. Every idea sits in a white card with a
black outline. Numbers are stat cards that count up, and verdicts are rotated stamps. A cartoon
avatar sticker at the bottom left lip-syncs to the narration. (Reference: the AnyPS5
short, 2026-10-18, 3:05, 13 scenes.)

## The frame

- Chrome sits on top of every scene and is built automatically: the chapter header with its
  progress bar, the caption pill (English over Traditional Chinese), the avatar, and the watermark.
  Keep scene content inside the content zone, x 60–1020 and y 330–1390.
- Scenes hard-cut; there are no transitions. Pace comes from elements entering on the spoken word.
- 2–4 chapters for a 1-minute short, about 6 for a 3-minute one. Name them as short titles
  ("Opening", "How it works", "Ending").

## Composition rules

- One clear focal block per beat: a card, a stat or a diagram. Stack top to bottom; full width is 960px.
- Green is the brand accent (stamps, highlights, progress). Red marks what is wrong, missing or
  peaking (strike, ✗, red stamp, one red bar).
- Labels that belong to an element enter with it. Never let a caption float before its card.
- Every number on screen comes from the source and carries a `SRC` line with "as of <date>".
- Body ≥ 32px, labels ≥ 26px. Use `T(..., { w })` only when wrapping is intended.

## Don'ts

- No transitions, glow, gradients or emoji icons.
- No style label stamped on screen.
- No text in the caption, avatar or header zones.
- No literal "@" in scene html: the build turns `@name` into ids. Write `&#64;` instead.
