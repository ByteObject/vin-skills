// Builds compositions/watermark.html from chrome/watermark.mjs (shared with template B): the handle
// (video.config.mjs `watermark`) hops along the strip between the content zone (y < 842) and the
// subtitle card, over a faint sliding tile of the handle across the frame.
import { writeFileSync } from 'node:fs';
import { C } from '../scenes/lib.mjs';
import { watermark } from './watermark.mjs';

const MARK_SPOTS = ['right:64px;top:850px', 'left:64px;top:850px', 'left:850px;top:850px'];

// mark: watermark text or '' (returns '' and writes nothing when there is no mark)
export function buildWatermark(total, fontFaces, mark) {
  const wm = watermark(mark, total, { spots: MARK_SPOTS, id: 'watermark', font: '700 32px "Kalam", cursive', color: C.ink });
  if (!wm.html) return '';
  const html = `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /></head>
  <body>
    <template id="watermark-template">
      <style>
${fontFaces}
        #watermark { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }${wm.css}
      </style>
      <div id="watermark" data-composition-id="watermark" data-width="1920" data-height="1080">
${wm.html}
      </div>
      <script>
        (function () {
          const tl = gsap.timeline({ paused: true });${wm.js}
          window.__timelines["watermark"] = tl;
        })();
      </script>
    </template>
  </body>
</html>
`;
  writeFileSync('compositions/watermark.html', html);
  console.log(`watermark on screen ${(wm.cover * 100).toFixed(0)}% of the film`);
  return `      <div id="host-watermark" class="clip scene-host" style="z-index: 190" data-composition-id="watermark" data-composition-src="compositions/watermark.html" data-start="0" data-duration="${total}" data-track-index="8" data-track-kind="graphics" data-width="1920" data-height="1080"></div>`;
}
