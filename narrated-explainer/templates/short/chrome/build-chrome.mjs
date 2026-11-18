// Builds compositions/chrome.html: chapter header + segmented progress bar (top) and the
// lip-synced avatar sticker (bottom left), plus the optional watermark from chrome/watermark.mjs
// (shared with template A): a handle hopping between corners over a faint sliding tile.
// Colours follow the scene theme (paper or green).
import { writeFileSync } from 'node:fs';
import { C } from '../scenes/lib.mjs';
import { visemeTrack } from './visemes.mjs';
import { watermark } from './watermark.mjs';

const SHAPES = ['rest', 'teeth', 'open', 'o', 'wide', 'blink'];
const BAR_X = 75;
const BAR_W = 930;
const GAP = 12;
const MARK_SPOTS = ['right:64px;top:118px', 'right:64px;top:1800px', 'left:75px;top:118px'];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const r3 = (n) => Math.round(n * 1000) / 1000;

// chapters: [{ name, start, end }]; themes: [[t, 'paper'|'green']]; clips: [{ words, offset }]; mark: watermark text or ''
export function buildChrome(chapters, themes, clips, total, fontFaces, mark) {
  const span = chapters.reduce((a, ch) => a + (ch.end - ch.start), 0);
  const free = BAR_W - GAP * (chapters.length - 1);
  let x = BAR_X;
  const segs = chapters.map((ch) => {
    const w = Math.max(40, Math.round((free * (ch.end - ch.start)) / span));
    const seg = { x, w };
    x += w + GAP;
    return seg;
  });
  const n = chapters.length;
  const pad = (k) => String(k).padStart(2, '0');
  const track = visemeTrack(clips, total);
  const wm = watermark(mark, total, { spots: MARK_SPOTS, id: 'chrome-wm', font: '800 32px "Noto Sans", sans-serif', color: 'var(--ink)' });
  if (wm.html) console.log(`watermark on screen ${(wm.cover * 100).toFixed(0)}% of the film`);
  const html = `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /></head>
  <body>
    <template id="chrome-template">
      <style>
${fontFaces}
        #chrome { position: absolute; inset: 0; overflow: hidden; pointer-events: none; font-family: "Noto Sans", sans-serif; --ink: ${C.ink}; --soft: ${C.soft}; --track: #DADAD3; }
        #chrome[data-theme="green"] { --ink: ${C.light}; --soft: rgba(238,244,241,0.6); --track: rgba(238,244,241,0.2); }
        #chrome .hdr { position: absolute; left: ${BAR_X}px; top: 196px; height: 60px; white-space: nowrap; opacity: 0; }
        #chrome .hdr .k { font-family: "JB Mono", monospace; font-size: 34px; color: var(--soft); letter-spacing: 0.02em; }
        #chrome .hdr .nm { font-size: 40px; font-weight: 800; color: var(--ink); margin-left: 22px; }
        #chrome .seg { position: absolute; top: 266px; height: 9px; border-radius: 5px; background: var(--track); overflow: hidden; }
        #chrome .seg i { position: absolute; inset: 0; background: var(--ink); border-radius: 5px; transform-origin: 0 50%; transform: scaleX(0); }
        #chrome #av { position: absolute; left: 18px; top: 1545px; width: 360px; height: 375px; }
        #chrome #av img { position: absolute; inset: 0; width: 360px; height: 375px; opacity: 0; }
        #chrome #av #av-rest { opacity: 1; }${wm.css}
      </style>
      <div id="chrome" data-composition-id="chrome" data-width="1080" data-height="1920" data-theme="${themes[0][1]}">
${wm.html}
${chapters.map((ch, i) => `        <div class="hdr" id="chrome-h${i}"><span class="k">${pad(i + 1)}/${pad(n)}</span><span class="nm">${esc(ch.name)}</span></div>`).join('\n')}
${segs.map((s, i) => `        <div class="seg" style="left:${s.x}px;width:${s.w}px"><i id="chrome-f${i}"></i></div>`).join('\n')}
        <div id="av">
${SHAPES.map((s) => `          <img id="av-${s}" src="assets/avatar-${s}.png" alt="" />`).join('\n')}
        </div>
      </div>
      <script>
        (function () {
          const tl = gsap.timeline({ paused: true });
          const CH = ${JSON.stringify(chapters.map((ch) => [r3(ch.start), r3(ch.end)]))};
          CH.forEach(([s, e], i) => {
            tl.set('#chrome-h' + i, { opacity: 1 }, s);
            if (i < CH.length - 1) tl.set('#chrome-h' + i, { opacity: 0 }, CH[i + 1][0]);
            tl.fromTo('#chrome-f' + i, { scaleX: 0 }, { scaleX: 1, duration: e - s, ease: 'none' }, s);
          });
          ${wm.js.trim()}
          const THEMES = ${JSON.stringify(themes.map(([t, th]) => [r3(t), th]))};
          THEMES.forEach(([t, th]) => tl.set('#chrome', { attr: { 'data-theme': th } }, t));
          const SEQ = ${JSON.stringify(track)};
          let prev = 'rest';
          SEQ.forEach(([t, s]) => {
            if (s === prev) return;
            tl.set('#av-' + prev, { opacity: 0 }, t);
            tl.set('#av-' + s, { opacity: 1 }, t);
            prev = s;
          });
          tl.to('#av', { y: -5, duration: 1.7, ease: 'sine.inOut', yoyo: true, repeat: ${Math.max(1, Math.floor(total / 1.7) - 1)} }, 0);
          window.__timelines["chrome"] = tl;
        })();
      </script>
    </template>
  </body>
</html>
`;
  writeFileSync('compositions/chrome.html', html);
  return `      <div id="host-chrome" class="clip scene-host" style="z-index: 180" data-composition-id="chrome" data-composition-src="compositions/chrome.html" data-start="0" data-duration="${total}" data-track-index="8" data-track-kind="graphics" data-width="1080" data-height="1920"></div>`;
}
