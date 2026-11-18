// Builds compositions/captions.html (English phrase over its Traditional Chinese line in a dark pill)
// and the .en / .zh-Hant / .en-zh .srt sidecars from captions/cues.mjs + narration/sNN.words.json.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { CUES } from './cues.mjs';

const LEAD_IN = 0.06;
const HOLD = 0.3;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const stamp = (t, sep) => {
  const ms = Math.round(t * 1000);
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor((ms % 3600000) / 60000))}:${p(Math.floor((ms % 60000) / 1000))}${sep}${p(ms % 1000, 3)}`;
};

export function timedCaptions(clips, total) {
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
  return caps.map((c, i) => {
    const next = caps[i + 1];
    return { ...c, start: Math.max(0, c.start - LEAD_IN), end: Math.min(c.end + HOLD, next ? next.start - LEAD_IN - 0.02 : total) };
  });
}

export function buildCaptions(clips, total, fontFaces, base) {
  const caps = timedCaptions(clips, total);
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
        #captions { position: absolute; inset: 0; pointer-events: none; }
        @font-face { font-family: "LXGW WenKai TC"; src: url("fonts/lxgw-wenkai-tc-500-subset.woff2") format("woff2"); font-weight: 500; }
        #captions .capwrap { position: absolute; left: 40px; right: 40px; top: 1398px; display: grid; justify-items: center; align-items: start; }
        #captions .cap { grid-area: 1 / 1; opacity: 0; max-width: 1000px; padding: 8px 30px 12px; border-radius: 14px; background: #3A3A3A;
          color: #FFFFFF; font-family: "Noto Sans", sans-serif; text-align: center; white-space: nowrap; }
        #captions .cap .en { display: block; font-weight: 800; font-size: 50px; line-height: 1.2; }
        #captions .cap .zh { display: block; font-family: "Noto Sans", "LXGW WenKai TC", sans-serif; font-weight: 700; font-size: 42px; line-height: 1.35; color: #F2E7B8; }
      </style>
      <div id="captions" data-composition-id="captions" data-width="1080" data-height="1920">
        <div class="capwrap">
${caps.map((c, i) => `          <div class="cap" id="captions-c${i}"><span class="en">${esc(c.en)}</span><span class="zh">${esc(c.zh)}</span></div>`).join('\n')}
        </div>
      </div>
      <script>
        (function () {
          const tl = gsap.timeline({ paused: true });
          const CAPS = ${JSON.stringify(caps.map((c) => [Number(c.start.toFixed(3)), Number(c.end.toFixed(3))]))};
          CAPS.forEach(([start, end], i) => {
            const sel = '#captions-c' + i;
            tl.set(sel, { opacity: 1 }, start);
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
  return `      <div id="host-captions" class="clip scene-host" style="z-index: 200" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="${total}" data-track-index="9" data-track-kind="captions" data-width="1080" data-height="1920"></div>`;
}
