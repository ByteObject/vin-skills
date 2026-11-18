---
name: narrated-explainer
description: Make a narrated explainer video about a repo, product, or topic with HyperFrames, from one of two templates — `notebook` (A, 1920×1080 hand-drawn investigator notebook, 2–6 min) or `short` (B, 1080×1920 vertical card short for Threads / Reels / Shorts, ~1–3 min, lip-synced avatar, chapter progress bar, watermark). Both have English Kokoro voiceover, a faint `@vincent_aidev` watermark, locally synthesized background music, and burned-in English + Traditional Chinese subtitles. Use whenever the user asks for an explainer video, motion animation, a short / vertical / Threads / Reels video, "A" or "B", or "a video like <reference>" for a project. Encodes the user's fixed preferences so voice, music, subtitles and tooling are never asked about again.
---

# Narrated explainer video

Two proven templates share one pipeline. Reuse them as is.
This skill builds on the HyperFrames skills (`/hyperframes`, `/general-video`, `/hyperframes-core`,
`/hyperframes-animation`). Load those for composition rules, but **this skill's defaults
replace their interview questions**.

## Pick the template

| Name | Say | Look | Reference |
|---|---|---|---|
| `notebook` | **A**, notebook, landscape, explainer | 1920×1080 hand-drawn investigator notebook: sticky notes, marker arrows, push / scribble transitions, camera moves | REA explainer (2026-10-10, 4:41, 17 scenes) |
| `short` | **B**, short, vertical, Threads, Reels, Shorts, TikTok | 1080×1920 ruled paper / deep green cards, chapter header + progress bar, caption pill, lip-synced avatar sticker, drifting watermark, hard cuts | AnyPS5 short (2026-10-18, 3:05, 13 scenes) |

The user's words decide: "A" → `notebook`, "B" → `short`. If they say neither, infer from
words such as vertical / short / Threads / Reels (→ `short`) or landscape / YouTube (→ `notebook`).
If nothing points either way, ask one question: "A (notebook, landscape) or B (vertical short)?"

## Fixed defaults — never ask about these

| Item | `notebook` (A) | `short` (B) |
|---|---|---|
| Canvas | 1920×1080, 30 fps, MP4 (h264 + AAC) | 1080×1920, 30 fps, MP4 (h264 + AAC) |
| Voice | Kokoro `af_heart`, speed 0.95 | Kokoro `am_michael`, speed 1.05 |
| Length | 3–4 min | ~3 min (1 min if the user says "short and quick") |
| Scene change | `transitions` in config: s01 `cut`, act breaks `scribble`, the rest `push`, an occasional `fade` | hard cuts; the `chapters` config drives the header + progress bar |
| Subtitles | two lines at the bottom, cues ≤ ~60 English chars | English over Chinese in a dark pill above the avatar, cues en ≤ ~28 chars, zh ≤ ~20 chars |
| Extras | watermark (see below), its handle hopping along the strip between the content zone and the subtitle card | avatar (the user's own cartoon, bundled in `assets/avatar-*.png`), lip-synced from word timings; watermark (see below), its handle hopping between the top corners and bottom right |

Shared defaults for both templates:
| Watermark | `@vincent_aidev` from `video.config.mjs` `watermark` (`''` turns it off), built by `chrome/watermark.mjs` (copied from `common/`). Two layers so it is hard to crop, blur or mask out: the handle at 50% opacity, hopping between spots and drifting while shown (on screen ~80% of the film; the build fails below 60%), over a faint (3.5%) tile of the handle across the whole frame that slides diagonally all film long. Both sit under the subtitles. Tune the constants at the top of `chrome/watermark.mjs`. |

| Item | Default |
|---|---|
| Voice | English, generated locally (`hyperframes tts`). No HeyGen/provider/sign-in questions. The voice and speed come from `video.config.mjs`. |
| Subtitles | Burned in: English plus **Traditional Chinese (繁體中文, Taiwan wording: 程式碼, 原始碼, 伺服器, 終端機, 代理, 應用程式…)**. Never Simplified. Also write `.en.srt`, `.zh-Hant.srt`, `.en-zh.srt`. |
| Music | Synthesized locally (`tools/make_bgm.py`, soft piano/pad), automated louder in pauses and carved under the voice. |
| Facts | Only from the source (repo README/docs/code). Dated numbers (stars, versions) get "as of <date>". Real screenshots from the source's docs/assets. |
| Labels | Never stamp the writing style or rule set (e.g. "ASD-STE100") on screen; apply it silently. |
| Review | Skip the sketch pause; build the whole film, run checks, render a review MP4, then iterate on feedback. |
| Location | `<current path>/<kebab-name>/`, in the folder the session runs in. Not the session scratchpad, which is deleted. Reference material (transcript, frames, ref audio) goes in the project's `_ref/`. Never commit it to the user's repo unless asked. |

Ask only what can't be inferred: the subject (if not given), the length (if not given; use the template default),
and the template (only if nothing points either way).
State the template and the defaults in one line in the first progress update.

## Pipeline

Scripts are in `<skill>/scripts/` (bash; on Windows run them with the Bash tool / Git Bash).
`S=~/.claude/skills/narrated-explainer/scripts`. Layout of the skill: `common/` (files every
project gets: `captions/verify.mjs`, `chrome/watermark.mjs`, `tools/caption_words.py`, `tools/make_bgm.py`) and
`templates/<notebook|short>/` (build.mjs, video.config.mjs, frame.md, scenes/lib.mjs, captions/,
fonts, plus `chrome/` and the avatar `assets/` for `short`).

1. **Environment (once per machine; idempotent):** `bash $S/setup-env.sh`
   Creates `~/.cache/narrated-explainer/venv` (kokoro-onnx, soundfile, numpy, faster-whisper,
   fonttools, brotli) and caches `LXGWWenKaiTC-Medium.ttf`. `env.sh` exports `HYPERFRAMES_PYTHON`.
2. **Scaffold:** `bash $S/new-project.sh "$PWD/<name>" <name> <notebook|short>` (run from the working
   directory; `A`/`B` also work; default `notebook`). It runs hyperframes init, copies `common/` and the
   template, sets `base`, adds `hw-scribble-transition` (notebook only), and installs `@hyperframes/core` (for carve).
   Replace the example `narration/s01.txt`, `scenes/s01.mjs` and `captions/cues.mjs` content with your own.
3. **Research + script:** read the source; write `BRIEF.md` and `STORYBOARD.md` (one `## Frame N`
   per scene with narration, visual, `frame.md` rule citation, and `transition_in` for notebook or the chapter for short).
   ~150 words/min (~165 at speed 1.05).
   Arc: hook (problem) → what it is → how it works → breadth → proof/trust → getting started → close.
4. **Narration files:** `narration/sNN.txt`, one per scene, written as it should be **spoken**:
   spell acronyms with spaces (`M C P`, `I P C`, `A P Ks`), numbers in words
   (`seventy-six thousand`), `dot NET`, `C plus plus`, and names that TTS mangles
   (`npx rea-agents` → `npx REA agents`). Test doubtful words first, from the project root so the
   template's voice is used: `bash $S/say-test.sh "One command: npx REA agents setup."` prints what whisper hears.
5. **Voice + timings:** from the project root, `bash $S/voice.sh` (or `voice.sh s03 s07` to redo some).
   It reads `voice` / `speed` from `video.config.mjs`; `VOICE=… SPEED=…` override for one run.
6. **Cues:** `captions/cues.mjs` — per scene, an ordered list `{ en, zh, sp? }`; one cue ≈ one
   short clause (length limits per template above). `en` is the display text, `sp` the exact
   spoken words when they differ (numbers, spelled acronyms). `zh` is Traditional Chinese.
7. **Scenes + config:** `scenes/sNN.mjs` → `{ html, css?, js }`, built from `lib.mjs` helpers
   (see the references below). Time every beat to speech with `AT('spoken phrase'[, nth])`.
   Set `video.config.mjs`:
   - notebook: `base`, `transitions`, `extra` hold seconds for payoff scenes, `watermark`.
   - short: `base`, `chapters` (`[{ name, scenes: [...] }]`, in order, covering every scene),
     `green` (hook, payoff line, close), `lead` (silence before a scene's voice; default 0.35), `extra`, `watermark`.
   For more than ~6 scenes, build them in parallel subagents (2–4 scenes each), each given
   lib.mjs, frame.md, its storyboard frames and words.json files.
8. **Assemble + verify:** `bash $S/finish.sh` — cue/narration match, zh font subset, build,
   music bed sized to the film, carve, `hyperframes check`. Goal: 0 errors, 0 warnings
   (`canvas_overflow` info during notebook push transitions is expected).
   Then `npx hyperframes snapshot --at <t1,t2,...> --no-end -o <dir>` at a mid-point of every scene and look at each frame.
9. **Render:** `bash $S/render.sh` → `renders/<base>.mp4`, ffprobe summary, loudness, and
   `renders/<base>.contact.jpg`; look at the contact sheet.
10. **Deliver:** open the Studio preview (`npx hyperframes preview --background`), give the MP4 +
   SRT paths, say plainly that audio wasn't listened to (ask the user to check pronunciation and
   music level), ask what to change. Fixes: edit → `voice.sh <ids>` if narration changed →
   `finish.sh` → `render.sh`.

## `notebook` lib.mjs quick reference

Build-time (return HTML; ids written `'name'` become `sNN-name`, refer to them as `'#@name'`):
`T(id,x,y,text,{size,h,cls:'cav'|'mono'|'soft',color,w,rot,align,raw})`, `HLS(id,text)` highlighter
span, `CK(size)` check mark, `BOX(id,x,y,w,h,{fill,seed,html})`, `STICKY(id,x,y,w,h,color,rot,html)`,
`TAPELBL(id,x,y,text,rot)`, `TERM(id,x,y,w,cmd,size)`, `STAMP(id,x,y,text,color)`, `LENS(id,x,y,size)`,
`DOODLE(id,'star'|'spiral'|'squiggle'|'plus',x,y,size)`, and inside `<svg class="full">`:
`ARROW(id,p0,ctrl,p1,{color,dash})`, `CIRCLE(id,cx,cy,rx,ry,seed)`, `UNDER(id,x0,x1,y)`.
Palette `C.*` (paper, ink, soft, hl, red, blue, yellow, pink, lav, mint, peach, card…).

Runtime (in `js`; `c(t)` = scene-local time after the lead-in):
`WRITE(sel,at,dur)` handwriting, `DRAW` stroke draw-on, `BOXIN`, `ARR`, `HL`, `POP`, `SLAP`,
`IN(sel,from,at,dur,ease)`, `SHOW`, `OUT`, `TYPE(sel,at,dur)` + `BLINK` for TERM,
`COUNT(sel,from,to,at,dur)`, camera `CAMSET(x,y,s)` / `CAM(at,x,y,s,dur)` on the world, `tl.fromTo(...)`.
Scene transitions, the boil and the watermark (`chrome/build-watermark.mjs`) are added automatically.

## `short` lib.mjs quick reference

Content zone x 60–1020, y 330–1390 (header above, caption pill and avatar below; see `frame.md`).
Build-time: `T(id,x,y,text,{size,b,mono,soft,color,w,lh,ls,align,rot,cls})`,
`CARD(id,x,y,w,h,html,{kind:'dark'|'gray'|'dash'|'line',pad,ctr,rot,r})` (h `null` = auto height),
`TITLECARD(id,y,num,title,sub,credit)`, `STAT(id,x,y,w,h,big,unit,cap,{size,usize,csize,kind})`
(number span is `#@id-n` for COUNT), `SRC(id,x,y,text)` source line, `STAMP(id,x,y,text,{size,rot,red})`,
`TAG(id,x,y,text,{size,kind:'inv'|'mint'})`, `FRAME(id,x,y,w,h,src,{bw,r,html})` screenshot,
`TWEET(id,x,y,w,name,handle,body,foot)`, `STRIKE(id)` (inside a card), and
`SVG(LINE(id,[[x,y],...],{color,sw,dash}) + HEAD(id,x,y,angle,{color,sw}))`. Palette `C.*` (paper, ink,
soft, card, gray, green, mint, light, red…); `<span class="hl">` is the mint highlighter.

Runtime: `UP(sel,at,dur,dy)`, `POP`, `SHOW`, `OUT`, `DIM(sel,at,v)`, `SLAM` (stamps), `DRAW` (LINE),
`GROWX` / `GROWY` (bars), `STAGGER(sel,at,each,how)`, `COUNT(sel,from,to,at,dur,dec)`, `tl.fromTo(...)`.
Chrome (header, progress, captions, avatar, watermark) is added by `chrome/build-chrome.mjs`.

## Gotchas (all hit before — don't rediscover them)

Both templates:
- `hyperframes tts` says "Python 3 is required" → `HYPERFRAMES_PYTHON` must be the venv's python as a **Windows** path (env.sh does `cygpath -w`).
- faster-whisper: `device='cpu'` (no cublas DLL) and load audio with soundfile (PyAV metadata error). caption_words.py does both.
- Any extra root HTML in the project (e.g. `index.backup.html`) → `multiple_root_compositions`. Keep backups outside.
- Carve: voice `<audio>`s share `data-audio-group="voiceover"` + an `<hf-audio-group id="voiceover">`; run carve **without** `--voice` (it auto-records the group). It needs `@hyperframes/core` installed. Rebuild resets index.html → always carve after build (finish.sh does).
- `cues.mjs` must cover every narration token in order; `node captions/verify.mjs` lists mismatches.
- A phrase with an apostrophe goes in double quotes: `AT("it's")`.
- The contrast check only samples 5 points over the whole film, so a clean result on a long film proves little. Look at the snapshots.
- Text on a semi-transparent fill (`rgba(..., 0.94)`) fails the contrast check with a nonsense background colour. Give text boxes opaque fills.
- Snapshots: pass `--no-end -o <dir>`; without `--no-end` the files are named confusingly.
- Writing JS through a Python heredoc: `'\\n'` becomes a real newline inside the JS string. Use Edit instead.
- Twitter/X links return 402 to WebFetch — use `https://api.fxtwitter.com/<user>/status/<id>` to read a reference post.
- `npx hyperframes usage` may return http_403/unknown — say so and continue.
- A render-log line about drawElement falling back to screenshot capture is informational.

`notebook`:
- `data-layout-allow-overlap` is not inherited: rotated text needs it on every per-char span (`T(..., {rot})` does it).
- Zooming an image: zoom an inner wrapper inside an `overflow:hidden` frame so it never covers neighbours.
- Text that might wrap: give it `white-space: nowrap` (default for `T` without `w`) and check snapshots for overflow.

`short`:
- The runtime helpers are `fromTo` tweens, so an element stays hidden until its cue. Never add `SHOW(sel, 0)` "to be safe".
- Labels that belong to a card or screenshot must enter with it (same `UP`/`STAGGER`), or they float alone first.
- Green scenes turn bare text light automatically; `.card` keeps ink text so it stays readable there. Don't override `.card` colour.
- A literal `@` in scene html becomes an id; write `&#64;` (e.g. for a handle on screen).
- Keep cue lines short: a long `en` wraps the pill to three lines and covers the content.
