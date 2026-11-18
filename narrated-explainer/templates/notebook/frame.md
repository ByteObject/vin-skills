---
name: investigator-notebook
canvas: 1920x1080
colors:
  paper: "#F7EFDD"
  grid-minor: "#E9DDC2"
  grid-major: "#DCCBA6"
  ink: "#2A241D"
  ink-soft: "#5E5243"
  highlighter: "#F6CF4A"
  marker-red: "#D64532"
  ink-blue: "#2F5DA8"
  sticky-yellow: "#FBE38A"
  sticky-pink: "#F6C6D0"
  sticky-lavender: "#D9D0F1"
  sticky-mint: "#C7E9DA"
  sticky-peach: "#FAD3B1"
  tape: "#EADFC4"
  terminal-bg: "#2A241D"
  terminal-fg: "#F6CF4A"
typography:
  display: { family: "Kalam", weight: 700, file: "fonts/kalam-700-latin.woff2", sizes: "76–200px" }
  body: { family: "Kalam", weight: 400, file: "fonts/kalam-400-latin.woff2", sizes: "34–56px" }
  note: { family: "Caveat", weight: 600, file: "fonts/caveat-600-latin.woff2", sizes: "36–64px" }
  mono: { family: "JetBrains Mono", weight: 500, bundled: true, sizes: "30–60px" }
  zh-caption: { family: "LXGW WenKai TC", weight: 500, file: "fonts/lxgw-wenkai-tc-500-subset.woff2", sizes: "34px" }
spacing:
  gutter: 120px
  caption-keepout-top: 842px
components:
  sketch-box: "3.5px ink stroke, wobbled path (lib BOX), card or sticky fill"
  sticky-note: "flat sticky fill, rotate −4°..+4°, 6px 10px 0 offset shadow, tape strip on top"
  arrow: "ink-blue 5px stroke (lib ARROW), hand-drawn head"
  circle-callout: "marker-red 6px wobbled ellipse (lib CIRCLE) — max one per frame"
  highlight: "highlighter sweep behind text (lib HLS + HL)"
  terminal-pill: "terminal-bg fill, 18px radius, mono terminal-fg text, three dots (lib TERM + TYPE)"
  stamp: "rotated −6°, 4px border, Kalam 700, 0.08em tracking (lib STAMP)"
---

## Overview

An investigator's notebook. One sheet of cream graph paper the camera travels across;
every idea is drawn by hand — wobbly boxes, sticky notes, tape, a yellow highlighter, and
a red marker that circles only the thing that matters. Warm, curious, a little playful;
never a slide deck. (Reference: the hand-drawn REA explainer, 2026-10.)

## The frame

- Background is always `paper` with a 48px minor / 240px major grid (multiples of 1920,
  so push transitions line up at the seam).
- Content lives above `caption-keepout-top` (842px). The strip y 850–892 holds the watermark handle
  (bottom-left, bottom-centre or bottom-right). A faint tile of the handle covers the whole frame; ignore it. Below is the subtitle card:
  English (Kalam 400, 40px) over Traditional Chinese (LXGW WenKai TC 500, 34px).
- Anchor content to a side; left margin ~120px. Hero text 60–80% of frame width.
- 2–5 ambient decoratives per scene (doodles, tape, magnifier); everything wrapped in `.bo`
  boils on a quantized clock.

## Page layout (the look the user expects — reference: the temperature-zero project in the current path)

- Every scene is a filled notebook page, not a centred diagram: a bold handwritten **headline at
  top-left** (`T('head', 120, 70, …, { size: 72–84, h: true })` with ONE `HLS` keyword), or a
  `TAPELBL` at (120, 80) with a bold line under it at y≈160.
- Left column from x=120, right column at x≈1000–1080; content spans y≈170–800 and the full width.
- Mostly handwriting: bold lines 54–64px, body 42–46px, Caveat notes 34–42px, `BOX` cards with
  text or mono. Stickies sparingly (≤ ~4 per scene, lists only).
- Land the point with a bold takeaway line (54–92px, one highlighted word) at y≈600–760.
- No camera moves; when a scene changes topic, `OUT` the old content and write a new headline
  in the same spot. Recurring props stay small (a tape label, not a big sticky).

## Composition rules

- One accent per frame does the pointing: highlighter OR red circle, not both on one word.
- Blue is for connectors and arrows only. Red is for circling and striking out only.
- Real proof is real: screenshots come from the source (repo docs/assets), taped on the
  page; a zoom stays inside its taped frame (overflow hidden).
- Body ≥ 34px, labels ≥ 28px.

## Don'ts

- No glow, gradient text, neon, or dark UI chrome (except real screenshots and the terminal pill).
- No invented UI, no invented numbers.
- No pure #000/#fff.
