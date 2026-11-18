// Builds compositions/captions.html (bilingual EN over 繁體中文) and .srt sidecars from
// captions/cues.mjs (en + zh, zh in Traditional Chinese) + narration/sNN.words.json (word timings from tools/caption_words.py).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { CUES } from './cues.mjs';

const LEAD_IN = 0.08;
const HOLD = 0.35;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const stamp = (t, sep) => {
  const ms = Math.round(t * 1000);
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor((ms % 3600000) / 60000))}:${p(Math.floor((ms % 60000) / 1000))}${sep}${p(ms % 1000, 3)}`;
};

// clips: [{ id, voiceStart }] on the root timeline
export function buildCaptions(clips, total, fontFaces, base) {
  const caps = [];
  for (const { id, voiceStart } of clips) {
    if (!CUES[id]) throw new Error(`${id}: no cues in captions/cues.mjs`);
    const words = JSON.parse(readFileSync(`narration/${id}.words.json`, 'utf8'));
    let k = 0;
    for (const cue of CUES[id]) {
      const n = (cue.sp ?? cue.en).trim().split(/\s+/).length;
      const span = words.slice(k, k + n);
      if (span.length !== n) throw new Error(`${id}: cue "${cue.en}" runs past the narration tokens`);
      caps.push({ en: cue.en, zh: cue.zh, start: voiceStart + span[0].start, end: voiceStart + span[n - 1].end });
      k += n;
    }
    if (k !== words.length) throw new Error(`${id}: cues cover ${k} of ${words.length} narration tokens`);
  }
  caps.forEach((c, i) => {
    const next = caps[i + 1];
    c.start = Math.max(0, c.start - LEAD_IN);
    c.end = Math.min(c.end + HOLD, next ? next.start - LEAD_IN - 0.02 : total);
  });

  mkdirSync('renders', { recursive: true });
  const srt = (pick) => caps.map((c, i) => `${i + 1}\n${stamp(c.start, ',')} --> ${stamp(c.end, ',')}\n${pick(c)}\n`).join('\n');
  writeFileSync(`renders/${base}.en.srt`, srt((c) => c.en));
  writeFileSync(`renders/${base}.zh-Hant.srt`, srt((c) => c.zh));
  writeFileSync(`renders/${base}.en-zh.srt`, srt((c) => `${c.en}\n${c.zh}`));

  const html = `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /></head>
  <body>
    <template id="captions-template">
      <style>
${fontFaces}
        @font-face { font-family: "LXGW WenKai TC"; src: url("fonts/lxgw-wenkai-tc-500-subset.woff2") format("woff2"); font-weight: 500; }
        #captions { position: absolute; inset: 0; pointer-events: none; }
        #captions .capwrap { position: absolute; left: 160px; right: 160px; bottom: 34px; display: grid; justify-items: center; align-items: end; }
        #captions .cap { grid-area: 1 / 1; opacity: 0; max-width: 1560px; padding: 12px 34px 14px; border-radius: 16px;
          background: rgba(251, 246, 234, 0.94); border: 2px solid rgba(42, 36, 29, 0.18); box-shadow: 0 4px 0 rgba(42, 36, 29, 0.08);
          text-align: center; color: #2A241D; }
        #captions .en { font-family: "Kalam", cursive; font-weight: 400; font-size: 40px; line-height: 1.25; white-space: nowrap; }
        #captions .zh { font-family: "LXGW WenKai TC", serif; font-weight: 500; font-size: 34px; line-height: 1.4; color: #4A3F33; letter-spacing: 0.04em; margin-top: 2px; white-space: nowrap; }
      </style>
      <div id="captions" data-composition-id="captions" data-width="1920" data-height="1080">
        <div class="capwrap">
${caps.map((c, i) => `          <div class="cap" id="captions-c${i}"><div class="en">${esc(c.en)}</div><div class="zh" lang="zh-Hant">${esc(c.zh)}</div></div>`).join('\n')}
        </div>
      </div>
      <script>
        (function () {
          const tl = gsap.timeline({ paused: true });
          const CAPS = ${JSON.stringify(caps.map((c) => [Number(c.start.toFixed(3)), Number(c.end.toFixed(3))]))};
          CAPS.forEach(([start, end], i) => {
            const sel = '#captions-c' + i;
            tl.fromTo(sel, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: 'power1.out' }, start);
            tl.set(sel, { opacity: 0 }, end);
          });
          window.__timelines["captions"] = tl;
        })();
      </script>
    </template>
  </body>
</html>
`;
  writeFileSync('compositions/captions.html', html);
  return `      <div id="host-captions" class="clip scene-host" style="z-index: 200" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="${total}" data-track-index="9" data-track-kind="captions" data-width="1920" data-height="1080"></div>`;
}
