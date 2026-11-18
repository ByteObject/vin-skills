// Example scene. Every scene module exports { html, css?, js }.
// html: build-time helpers from lib.mjs ("@name" ids become "s01-name", "$S" scopes css to the scene).
// js: runtime helpers (UP, POP, SLAM, SHOW, DRAW, COUNT, STAGGER...) placed at AT('spoken phrase') times.
import { CARD, STAMP, T } from './lib.mjs';

export default {
  html: `
${CARD('app', 60, 420, 960, 230, `
  <div class="t mono soft" style="font-size:28px">someone else's app</div>
  <div class="t b" style="font-size:72px;margin-top:18px">a feature you like</div>`, { pad: '34px 40px' })}
${T('q', 60, 740, 'how did they<br>build that?', { size: 92, b: true, w: 960, lh: 1.15 })}
${STAMP('why', 560, 1040, 'BUT HOW?', { size: 52, red: true, rot: -7 })}
`,
  js: `
UP('#@app', AT('You spot'));
UP('#@q', AT('how did'));
SLAM('#@why', AT('build that'));
`,
};
