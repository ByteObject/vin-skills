// Example scene. Every scene module exports { html, css?, js }.
// html: build-time helpers from lib.mjs ("@name" ids become "s01-name", "$S" scopes css to the scene).
// js: runtime helpers (WRITE, DRAW, POP, BOXIN, ARR, HL, CAM...) placed at AT('spoken phrase') times.
import { C, T, STICKY, CIRCLE, DOODLE } from './lib.mjs';

export default {
  html: `
${T('q1', 140, 230, 'You spot a feature…', { size: 96, h: true })}
${T('q2', 140, 380, 'how did they build that?', { size: 80, cls: 'cav', color: C.blue })}
${STICKY('note', 1340, 180, 420, 300, C.yellow, 3, '<div style="font-size:52px;line-height:1.2">someone else\'s app</div>')}
<svg class="full">${CIRCLE('ring', 1550, 330, 260, 190, 4)}</svg>
${DOODLE('d1', 'star', 1180, 640, 70)}
`,
  js: `
WRITE('#@q1', AT('You spot'), 1.2);
POP('#@note', AT("someone else's"));
DRAW('#@ring', AT('app') + 0.2, 0.8);
WRITE('#@q2', AT('how did'), 1.1);
POP('#@d1', AT('build'));
`,
};
