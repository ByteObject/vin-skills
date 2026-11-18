// Generates compositions/sNN.html, compositions/chrome.html, compositions/captions.html and index.html
// (1080x1920, hard cuts between scenes). Each scene module exports default { html, css?, js }.
// Placeholders: "@name" -> "sNN-name" (ids), "$S" -> "#sNN" (scope selector).
// In scene js, AT('spoken phrase'[, nth]) resolves to the moment that phrase is spoken.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { buildCaptions } from './captions/build-captions.mjs';
import { buildChrome } from './chrome/build-chrome.mjs';
import { C, W, H, FONT_FACES, COMMON_CSS, COMMON_JS } from './scenes/lib.mjs';
import CONFIG from './video.config.mjs';

const ALL = readdirSync('narration').filter((f) => /^s\d+\.txt$/.test(f)).map((f) => f.replace('.txt', '')).sort();
const BASE = CONFIG.base;
const LEAD = 0.35;
const TAIL = 0.5;
const FINAL_HOLD = 2.6;
const GREEN = new Set(CONFIG.green || []);
const EXTRA = CONFIG.extra || {};

const audioDuration = (file) =>
  Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim());
const round2 = (n) => Math.round(n * 100) / 100;
const readWords = (id) => JSON.parse(readFileSync(`narration/${id}.words.json`, 'utf8'));

const MISSING = [];
const normWord = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, '');
function resolveCues(js, id) {
  const words = readWords(id).map((w) => ({ n: normWord(w.text), t: w.start }));
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

function musicLane(voice, total) {
  const LOW = 0.32;
  const pts = [{ t: 0, v: 0 }, { t: 1.2, v: 1 }];
  for (const { start, end } of voice) pts.push({ t: round2(start - 0.3), v: 1 }, { t: round2(start), v: LOW }, { t: round2(end), v: LOW }, { t: round2(end + 0.45), v: 1 });
  pts.push({ t: round2(total - 2.5), v: 1 }, { t: round2(total), v: 0 });
  const clean = [];
  for (const p of pts) {
    if (p.t < 0 || p.t > total) continue;
    if (clean.length && p.t <= clean[clean.length - 1].t) { clean[clean.length - 1].v = Math.min(clean[clean.length - 1].v, p.v); continue; }
    clean.push(p);
  }
  return JSON.stringify({ version: 1, lanes: [{ target: 'volume', points: clean }] });
}

function sceneHtml(id, scene, dur, lead, theme) {
  return `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /></head>
  <body>
    <template id="${id}-template">
      <style>
${FONT_FACES('')}
${fill(COMMON_CSS, id)}
${fill(scene.css || '', id)}
      </style>
      <div id="${id}" data-composition-id="${id}" data-width="${W}" data-height="${H}">
        <div class="stage ${theme}">
${fill(scene.html, id)}
        </div>
      </div>
      <script>
        (function () {
          const tl = gsap.timeline({ paused: true });
          ${COMMON_JS(id, dur, lead)}
          ${fill(resolveCues(scene.js, id), id)}
          window.__timelines["${id}"] = tl;
        })();
      </script>
    </template>
  </body>
</html>
`;
}

async function build() {
  let t = 0;
  const hosts = [];
  const audios = [];
  const voiceClips = [];
  const voiceRanges = [];
  const lipClips = [];
  const themes = [];
  const span = {};
  for (let i = 0; i < ALL.length; i++) {
    const id = ALL[i];
    const last = i === ALL.length - 1;
    const lead = (CONFIG.lead || {})[id] ?? LEAD;
    const theme = GREEN.has(id) ? 'green' : 'paper';
    const scene = (await import(`./scenes/${id}.mjs`)).default;
    const aDur = audioDuration(`narration/${id}.wav`);
    const dur = round2(lead + aDur + TAIL + (EXTRA[id] || 0) + (last ? FINAL_HOLD : 0));
    const start = round2(t);
    writeFileSync(`compositions/${id}.html`, sceneHtml(id, scene, dur, lead, theme));
    hosts.push(
      `      <div id="host-${id}" class="clip scene-host" style="z-index: ${i + 1}" data-composition-id="${id}" data-composition-src="compositions/${id}.html" data-start="${start}" data-duration="${dur}" data-track-index="${(i % 2) + 1}" data-track-kind="graphics" data-width="${W}" data-height="${H}"></div>`,
    );
    const vStart = round2(start + lead);
    audios.push(`      <audio id="vo-${id}" src="narration/${id}.wav" data-start="${vStart}" data-duration="${aDur.toFixed(2)}" data-track-index="5" data-volume="1" data-audio-group="voiceover"></audio>`);
    voiceClips.push({ id, voiceStart: vStart });
    voiceRanges.push({ start: vStart, end: vStart + aDur });
    lipClips.push({ words: readWords(id), offset: vStart });
    if (!themes.length || themes[themes.length - 1][1] !== theme) themes.push([start, theme]);
    span[id] = [start, start + dur];
    console.log(`${id}  ${theme.padEnd(6)} start ${start.toFixed(2)}s  dur ${dur}s  (voice ${aDur.toFixed(2)}s)`);
    t = start + dur;
  }
  if (MISSING.length) throw new Error('cues not found in narration:\n  ' + MISSING.join('\n  '));
  const total = round2(t);
  const chapters = CONFIG.chapters.map((ch) => ({ name: ch.name, start: span[ch.scenes[0]][0], end: span[ch.scenes[ch.scenes.length - 1]][1] }));
  const chromeHost = buildChrome(chapters, themes, lipClips, total, FONT_FACES(''), CONFIG.watermark || '');
  const captionHost = buildCaptions(voiceClips, total, FONT_FACES(''), BASE);
  const hasBgm = existsSync('assets/bgm.wav');
  const bgmDur = hasBgm ? audioDuration('assets/bgm.wav') : 0;
  if (!hasBgm) console.warn('no assets/bgm.wav yet: run tools/make_bgm.py');
  else if (bgmDur < total) console.warn(`assets/bgm.wav is ${bgmDur.toFixed(1)}s, shorter than the film (${total}s): regenerate it`);
  const md = round2(Math.min(bgmDur, total));
  const music = !hasBgm ? '' : `      <audio id="bgm" src="assets/bgm.wav" data-start="0" data-duration="${md}" data-track-index="6" data-volume="0.3" data-automation='${musicLane(voiceRanges, md)}'></audio>`;
  const index = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
${FONT_FACES('')}
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background: ${C.paper}; }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; background: ${C.paper}; font-family: "Noto Sans", sans-serif; }
      .scene-host { position: absolute; inset: 0; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${total}" data-width="${W}" data-height="${H}">
${hosts.join('\n')}
${chromeHost}
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
