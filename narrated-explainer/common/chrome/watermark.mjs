// Watermark shared by both templates. Two layers make it hard to crop, blur or mask out:
// - a handle that hops between spots (different corners/edges) and drifts while shown,
//   on screen for at least MIN_COVER of the film (the build fails otherwise);
// - a faint tile of the handle over the whole frame that slides diagonally all film long,
//   so no single region can be blurred and it can't be subtracted as a static overlay.
// Both sit under the subtitles. The tile is a CSS mask, so its colour follows `color`
// (a CSS value such as var(--ink)) and it is not text for the contrast check.
const FADE = 0.6;
const SHOW = 15; // seconds at one spot
const GAP = 3; // hidden seconds between spots
const DRIFT = 36; // px the handle moves while shown
const MARK_OPACITY = 0.5;
const MIN_COVER = 0.6;
const TILE_W = 560;
const TILE_H = 300;
const TILE_ROT = -24;
const TILE_SPEED = 8; // px per second, horizontally
const TILE_OPACITY = 0.035;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const r3 = (n) => Math.round(n * 1000) / 1000;

// windows at successive spots; the last one runs to the end of the film
function markPlan(total, spots) {
  const wins = [];
  for (let s = 0.5, k = 0; s < total; s += SHOW + GAP, k += 1) {
    const e = s + SHOW + GAP + 4 > total ? total : s + SHOW;
    wins.push({ spot: spots[k % spots.length], s: r3(s), e: r3(e), dx: k % 2 ? -DRIFT : DRIFT, dy: k % 3 === 1 ? -DRIFT / 3 : DRIFT / 3 });
    if (e === total) break;
  }
  return wins;
}

function tileMask(mark) {
  const t = (x, y) => `<text x='${x}' y='${y}' text-anchor='middle' dominant-baseline='middle'>${esc(mark)}</text>`;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${TILE_W}' height='${TILE_H}'><g font-family='Arial, sans-serif' font-size='30' font-weight='700' transform='rotate(${TILE_ROT} ${TILE_W / 2} ${TILE_H / 2})'>${t(TILE_W * 0.25, TILE_H * 0.25)}${t(TILE_W * 0.75, TILE_H * 0.75)}</g></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

// mark: handle text or '' (all parts empty); total: film seconds; spots: inline CSS positions;
// id: prefix for element ids; font: CSS font for the handle; color: CSS colour for both layers.
// Returns { css, html, js } to put inside the host composition, plus cover (share of time shown).
export function watermark(mark, total, { spots, id, font, color }) {
  if (!mark) return { css: '', html: '', js: '', cover: 0 };
  const wins = markPlan(total, spots);
  const cover = wins.reduce((a, w) => a + (w.e - w.s - FADE), 0) / total;
  if (cover < MIN_COVER) throw new Error(`watermark on screen ${(cover * 100).toFixed(0)}% of the film, below ${MIN_COVER * 100}%`);
  const loops = Math.max(1, Math.ceil(total / (TILE_W / TILE_SPEED)));
  const css = `
        .${id}-tile { position: absolute; left: -${TILE_W}px; top: -${TILE_H}px; right: -${TILE_W}px; bottom: -${TILE_H}px; pointer-events: none;
          background: ${color}; opacity: ${TILE_OPACITY}; -webkit-mask-image: ${tileMask(mark)}; mask-image: ${tileMask(mark)};
          -webkit-mask-size: ${TILE_W}px ${TILE_H}px; mask-size: ${TILE_W}px ${TILE_H}px; }
        .${id}-mark { position: absolute; font: ${font}; letter-spacing: 0.01em; color: ${color}; opacity: 0; white-space: nowrap; pointer-events: none; }`;
  const html = [
    `        <div class="${id}-tile" id="${id}-tile" data-layout-ignore></div>`,
    ...wins.map((w, i) => `        <div class="${id}-mark" id="${id}-m${i}" style="${w.spot}">${esc(mark)}</div>`),
  ].join('\n');
  const js = `
          tl.fromTo('#${id}-tile', { x: 0, y: 0 }, { x: ${TILE_W}, y: ${TILE_H}, duration: ${r3(total / loops)}, ease: 'none', repeat: ${loops - 1} }, 0);
          ${JSON.stringify(wins.map((w) => [w.s, w.e, w.dx, w.dy]))}.forEach(([s, e, dx, dy], i) => {
            const m = '#${id}-m' + i;
            tl.fromTo(m, { opacity: 0 }, { opacity: ${MARK_OPACITY}, duration: ${FADE}, ease: 'power1.out' }, s);
            tl.fromTo(m, { x: 0, y: 0 }, { x: dx, y: dy, duration: e - s, ease: 'sine.inOut' }, s);
            if (e < ${r3(total)}) tl.to(m, { opacity: 0, duration: ${FADE}, ease: 'power1.in' }, e - ${FADE});
          });`;
  return { css, html, js, cover };
}
