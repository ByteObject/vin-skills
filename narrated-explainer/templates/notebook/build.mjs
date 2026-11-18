// Generates compositions/sNN.html, the act-break scribble overlays, compositions/captions.html
// and index.html from scenes/sNN.mjs. Each scene module exports default { html, css, js }.
// Placeholders: "@name" -> "sNN-name" (ids), "$S" -> "#sNN" (scope selector).
// In scene js, AT('spoken phrase'[, nth]) resolves to the moment that phrase is spoken.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { buildCaptions } from './captions/build-captions.mjs';
import { buildWatermark } from './chrome/build-watermark.mjs';
import { C, FONT_FACES, COMMON_CSS, COMMON_JS } from './scenes/lib.mjs';
import CONFIG from './video.config.mjs';

const ALL = readdirSync('narration').filter((f) => /^s\d+\.txt$/.test(f)).map((f) => f.replace('.txt', '')).sort();
const BASE = CONFIG.base;
const PUSH = 0.9; // notebook slide between scenes
const XFADE = 0.7;
const SCRIBBLE_COVER = 1.1; // local time in the scribble overlay where the frame is fully covered
const TAIL = 1.3;
const FINAL_HOLD = 3.5;
// how each scene arrives (from STORYBOARD.md transition_in): cut | push (default) | fade | scribble
const TRANS = CONFIG.transitions || {};
const transIn = (id) => TRANS[id] || 'push';
const EXTRA = CONFIG.extra || {}; // extra seconds after a scene's narration to let a payoff land

const audioDuration = (file) =>
  Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim());
const round2 = (n) => Math.round(n * 100) / 100;

const MISSING = [];
const normWord = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, '');
function resolveCues(js, id) {
  const words = JSON.parse(readFileSync(`narration/${id}.words.json`, 'utf8')).map((w) => ({ n: normWord(w.text), t: w.start }));
  return js.replace(/AT\((['"])(.+?)\1(?:,\s*(\d+))?\)/g, (_, _q, phrase, nth) => {
    const parts = phrase.split(/\s+/).map(normWord);
    let seen = 0;
    for (let i = 0; i < words.length; i++) {
      if (parts.every((p, k) => words[i + k] && words[i + k].n === p) && ++seen === (Number(nth) || 1)) return `c(${words[i].t.toFixed(2)})`;
    }
    MISSING.push(`${id}: "${phrase}"${nth ? ` #${nth}` : ''}`);
    return 'c(0)';
  });
}
const fill = (s, id) => s.replace(/\$S/g, `#${id}`).replace(/@([A-Za-z][\w-]*)/g, `${id}-$1`);

// act-break overlay: a per-instance copy of the registry's hw-scribble-transition (unique ids, templated)
function scribbleOverlay(n) {
  const src = readFileSync('compositions/hw-scribble-transition.html', 'utf8');
  const style = src.match(/<style>([\s\S]*?)<\/style>/)[1];
  const body = src.match(/<body>([\s\S]*?)<\/body>/)[1];
  const cid = `scribble-${n}`;
  const out = `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /></head>
  <body>
    <template id="${cid}-template">
      <style>${style}</style>
      ${body}
    </template>
  </body>
</html>
`
    .replace(/body \{[^}]*\}/, '')
    .replace(/#hw-st-root \{/, '#hw-st-root { position: absolute; inset: 0; width: auto; height: auto;')
    .replace(/--hw-accent: #ffb020;/, `--hw-accent: ${C.hl};`)
    .replace(/data-composition-id="hw-scribble-transition"/, `data-composition-id="${cid}"`)
    .replace(/window\.__timelines\["hw-scribble-transition"\]/, `window.__timelines["${cid}"]`)
    .replace(/\s*tl\.set\(root, \{ visibility: "hidden" \}, 2\.17\);/, '')
    .replace(/\s*window\.__timelines = window\.__timelines \|\| \{\};/, '')
    .replace(/seed: 17/, `seed: ${11 + n * 7}`)
    .replace(/hw-st-/g, `sc${n}-`);
  writeFileSync(`compositions/${cid}.html`, out);
  return cid;
}

// music bed: full in gaps, carved under narration, fades at both ends
function musicLane(voice, total) {
  const LOW = 0.36;
  const pts = [{ t: 0, v: 0 }, { t: 1.5, v: 1 }];
  for (const { start, end } of voice) pts.push({ t: round2(start - 0.35), v: 1 }, { t: round2(start), v: LOW }, { t: round2(end), v: LOW }, { t: round2(end + 0.5), v: 1 });
  pts.push({ t: round2(total - 3), v: 1 }, { t: round2(total), v: 0 });
  const clean = [];
  for (const p of pts) {
    if (p.t < 0 || p.t > total) continue;
    if (clean.length && p.t <= clean[clean.length - 1].t) { clean[clean.length - 1].v = Math.min(clean[clean.length - 1].v, p.v); continue; }
    clean.push(p);
  }
  return JSON.stringify({ version: 1, lanes: [{ target: 'volume', points: clean }] });
}

async function build() {
  let t = 0;
  const hosts = [];
  const overlays = [];
  const audios = [];
  const voiceClips = [];
  const voiceRanges = [];
  let nScribble = 0;
  for (let i = 0; i < ALL.length; i++) {
    const id = ALL[i];
    const next = ALL[i + 1];
    const tin = transIn(id);
    const tout = next ? transIn(next) : 'end';
    const lead = tin === 'scribble' ? 1.2 : tin === 'cut' ? 0.8 : 1.0;
    const scene = (await import(`./scenes/${id}.mjs`)).default;
    const aDur = audioDuration(`narration/${id}.wav`);
    const overlap = tout === 'push' ? PUSH : tout === 'fade' ? XFADE : 0;
    const dur = round2(lead + aDur + TAIL + overlap + (EXTRA[id] || 0) + (next ? 0 : FINAL_HOLD));
    const start = round2(t);
    const html = `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /></head>
  <body>
    <template id="${id}-template">
      <style>
${FONT_FACES('')}
${fill(COMMON_CSS, id)}
${fill(scene.css || '', id)}
      </style>
      <div id="${id}" data-composition-id="${id}" data-width="1920" data-height="1080">
        <div class="stage">
          <div id="${id}-world" class="world">
${fill(scene.html, id)}
          </div>
          <div class="vignette" data-layout-ignore></div>
        </div>
      </div>
      <script>
        (function () {
          const tl = gsap.timeline({ paused: true });
          ${COMMON_JS(id, dur, { lead, push: PUSH, xfade: XFADE, transIn: tin === 'push' ? 'push' : tin === 'fade' ? 'fade' : 'none', transOut: tout === 'push' ? 'push' : 'none' })}
          ${fill(resolveCues(scene.js, id), id)}
          BOIL();
          window.__timelines["${id}"] = tl;
        })();
      </script>
    </template>
  </body>
</html>
`;
    writeFileSync(`compositions/${id}.html`, html);
    hosts.push(
      `      <div id="host-${id}" class="clip scene-host" style="z-index: ${i + 1}" data-composition-id="${id}" data-composition-src="compositions/${id}.html" data-start="${start}" data-duration="${dur}" data-track-index="${(i % 2) + 1}" data-track-kind="graphics" data-width="1920" data-height="1080"></div>`,
    );
    if (tin === 'scribble') {
      const cid = scribbleOverlay(++nScribble);
      overlays.push(
        `      <div id="host-${cid}" class="clip scene-host" style="z-index: 150" data-composition-id="${cid}" data-composition-src="compositions/${cid}.html" data-start="${round2(start - SCRIBBLE_COVER)}" data-duration="2.2" data-track-index="3" data-track-kind="graphics" data-width="1920" data-height="1080"></div>`,
      );
    }
    const vStart = round2(start + lead);
    audios.push(`      <audio id="vo-${id}" src="narration/${id}.wav" data-start="${vStart}" data-duration="${aDur.toFixed(2)}" data-track-index="5" data-volume="1" data-audio-group="voiceover"></audio>`);
    voiceClips.push({ id, voiceStart: vStart });
    voiceRanges.push({ start: vStart, end: vStart + aDur });
    console.log(`${id}  ${tin.padEnd(8)} start ${start.toFixed(2)}s  dur ${dur}s  (voice ${aDur.toFixed(2)}s)`);
    t = start + dur - overlap;
  }
  if (MISSING.length) throw new Error('cues not found in narration:\n  ' + MISSING.join('\n  '));
  const total = round2(t);
  const captionHost = buildCaptions(voiceClips, total, FONT_FACES(''), BASE);
  const markHost = buildWatermark(total, FONT_FACES(''), CONFIG.watermark || '');
  const hasBgm = existsSync('assets/bgm.wav');
  const bgmDur = hasBgm ? audioDuration('assets/bgm.wav') : 0;
  if (!hasBgm) console.warn('no assets/bgm.wav yet: run tools/make_bgm.py');
  else if (bgmDur < total) console.warn(`assets/bgm.wav is ${bgmDur.toFixed(1)}s, shorter than the film (${total}s): regenerate it`);
  const md = round2(Math.min(bgmDur, total));
  const music = !hasBgm ? '' : `      <audio id="bgm" src="assets/bgm.wav" data-start="0" data-duration="${md}" data-track-index="6" data-volume="0.34" data-automation='${musicLane(voiceRanges, md)}'></audio>`;
  const index = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
${FONT_FACES('')}
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: ${C.paper}; }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; background: ${C.paper}; font-family: "Kalam", cursive; }
      .scene-host { position: absolute; inset: 0; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${total}" data-width="1920" data-height="1080">
${hosts.join('\n')}
${overlays.join('\n')}
${markHost}
${captionHost}
      <hf-audio-group id="voiceover" data-label="Voiceover" data-volume="1"></hf-audio-group>
${audios.join('\n')}
${music}
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;
  writeFileSync('index.html', index);
  console.log(`total ${total}s (${Math.floor(total / 60)}:${String(Math.round(total % 60)).padStart(2, '0')})`);
}

build().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
