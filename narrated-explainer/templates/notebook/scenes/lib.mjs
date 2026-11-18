// Shared palette, CSS, build-time HTML helpers and runtime JS helpers for every scene.
// Build-time helpers return HTML strings; "@name" becomes "<sceneId>-name" and "$S" the scene scope.

export const C = {
  paper: '#F7EFDD',
  gridMinor: '#E9DDC2',
  gridMajor: '#DCCBA6',
  ink: '#2A241D',
  soft: '#5E5243',
  hl: '#F6CF4A',
  red: '#D64532',
  blue: '#2F5DA8',
  yellow: '#FBE38A',
  pink: '#F6C6D0',
  lav: '#D9D0F1',
  mint: '#C7E9DA',
  peach: '#FAD3B1',
  tape: '#EADFC4',
  obs: '#2E7D4F',
  der: '#2F5DA8',
  inf: '#A35F08',
  unk: '#6E655A',
  orange: '#C9701A',
  card: '#FBF6EA',
};

export const FONT_FACES = (prefix) => `
@font-face { font-family: "Kalam"; src: url("${prefix}fonts/kalam-400-latin.woff2") format("woff2"); font-weight: 400; }
@font-face { font-family: "Kalam"; src: url("${prefix}fonts/kalam-700-latin.woff2") format("woff2"); font-weight: 700; }
@font-face { font-family: "Caveat"; src: url("${prefix}fonts/caveat-600-latin.woff2") format("woff2"); font-weight: 600; }`;

export const COMMON_CSS = `
$S { position: absolute; inset: 0; }
$S .stage { position: absolute; inset: 0; overflow: hidden; color: ${C.ink}; font-family: "Kalam", cursive; font-weight: 400;
  background-color: ${C.paper};
  background-image:
    linear-gradient(${C.gridMajor} 2px, transparent 2px), linear-gradient(90deg, ${C.gridMajor} 2px, transparent 2px),
    linear-gradient(${C.gridMinor} 1px, transparent 1px), linear-gradient(90deg, ${C.gridMinor} 1px, transparent 1px);
  background-size: 240px 240px, 240px 240px, 48px 48px, 48px 48px; }
$S .vignette { position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse at 50% 42%, rgba(120,90,40,0) 58%, rgba(120,90,40,0.16) 100%); }
$S .world { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; transform-origin: 0 0; }
$S svg.full { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; overflow: visible; pointer-events: none; }
$S .a { position: absolute; }
$S .rot, $S .bo { position: relative; width: 100%; height: 100%; }
$S .h { font-weight: 700; line-height: 1.05; }
$S .t { white-space: nowrap; line-height: 1.15; }
$S .wrap { white-space: normal; }
$S .cav { font-family: "Caveat", cursive; font-weight: 600; }
$S .mono { font-family: "JetBrains Mono", monospace; font-weight: 500; }
$S .soft { color: ${C.soft}; }
$S .ch { display: inline; }
$S .boxsvg { position: absolute; left: 0; top: 0; overflow: visible; }
$S .boxsvg path { stroke: ${C.ink}; stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round; }
$S .boxin { position: absolute; inset: 0; padding: 26px 32px; }
$S .sticky .paper { position: absolute; inset: 0; box-shadow: 6px 10px 0 rgba(42,36,29,0.13); }
$S .sticky .tapebit { position: absolute; top: -18px; left: 50%; width: 130px; height: 36px; margin-left: -65px; background: ${C.tape}; opacity: 0.92; }
$S .sticky .sin { position: absolute; inset: 0; padding: 30px 30px; }
$S .tapelbl { background: ${C.tape}; padding: 10px 34px; box-shadow: 0 3px 0 rgba(42,36,29,0.08); white-space: nowrap; }
$S .hlw { position: relative; display: inline-block; padding: 0 10px; }
$S .hlbg { position: absolute; left: 0; right: 0; top: 40%; bottom: 6%; background: rgba(246,207,74,0.88); transform-origin: 0 50%; }
$S .hltx { position: relative; }
$S .term { background: ${C.ink}; color: ${C.hl}; border-radius: 18px; padding: 40px 46px 32px; font-family: "JetBrains Mono", monospace; font-weight: 500; white-space: nowrap; }
$S .term .dots { position: absolute; top: 10px; left: 24px; font-size: 18px; letter-spacing: 4px; color: #8A7B66; }
$S .term .tc { display: none; }
$S .caret { display: inline-block; width: 0.55em; height: 1em; margin-left: 4px; vertical-align: -0.12em; background: ${C.hl}; }
$S .stamp { border: 4px solid currentColor; border-radius: 8px; padding: 4px 18px; font-weight: 700; letter-spacing: 0.08em; white-space: nowrap; }
$S .dr { stroke-dasharray: 1 2; }
`;

// ---------- deterministic build-time geometry ----------
export const hash = (n, seed) => {
  const x = Math.sin(n * 127.1 + (seed || 1) * 311.7) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
};
const f1 = (n) => n.toFixed(1);

// wobbled rounded rectangle path (after the registry's hw-box-label)
export function wobbleRect(w, h, r, seed, amp = 3.5) {
  const wob = (n) => hash(n, seed) * amp;
  let d = `M ${f1(r + wob(1))} ${f1(wob(2))}`;
  d += ` L ${f1(w / 2 + wob(3))} ${f1(wob(4))} L ${f1(w - r + wob(5))} ${f1(wob(6))}`;
  d += ` Q ${f1(w + wob(7))} ${f1(wob(8))} ${f1(w + wob(9))} ${f1(r + wob(10))}`;
  d += ` L ${f1(w + wob(11))} ${f1(h / 2 + wob(12))} L ${f1(w + wob(13))} ${f1(h - r + wob(14))}`;
  d += ` Q ${f1(w + wob(15))} ${f1(h + wob(16))} ${f1(w - r + wob(17))} ${f1(h + wob(18))}`;
  d += ` L ${f1(w / 2 + wob(19))} ${f1(h + wob(20))} L ${f1(r + wob(21))} ${f1(h + wob(22))}`;
  d += ` Q ${f1(wob(23))} ${f1(h + wob(24))} ${f1(wob(25))} ${f1(h - r + wob(26))}`;
  d += ` L ${f1(wob(27))} ${f1(h / 2 + wob(28))} L ${f1(wob(29))} ${f1(r + wob(30))}`;
  d += ` Q ${f1(wob(31))} ${f1(wob(32))} ${f1(r + wob(33))} ${f1(wob(34))} Z`;
  return d;
}

// hand-drawn ellipse: a little more than one lap, radius drifting like a marker stroke
export function wobbleEllipse(cx, cy, rx, ry, seed, tilt = -3) {
  const N = 56;
  const turns = 1.09;
  const a0 = -2.3 + hash(1, seed) * 0.3;
  const t = (tilt * Math.PI) / 180;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const a = a0 + (i / N) * turns * Math.PI * 2;
    const k = 1 + hash(i * 0.37 + 3, seed) * 0.035 + (i / N) * 0.05;
    const x = Math.cos(a) * rx * k;
    const y = Math.sin(a) * ry * k;
    pts.push([cx + x * Math.cos(t) - y * Math.sin(t), cy + x * Math.sin(t) + y * Math.cos(t)]);
  }
  let d = `M ${f1(pts[0][0])} ${f1(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += ` Q ${f1(pts[i][0])} ${f1(pts[i][1])} ${f1(mx)} ${f1(my)}`;
  }
  return d;
}

// ---------- build-time HTML helpers ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// split text into per-character spans for WRITE; markup segments [{t, cls}] allowed
export function chars(text, attr = '') {
  return [...String(text)].map((c) => (c === ' ' ? ' ' : `<span class="ch"${attr}>${esc(c)}</span>`)).join('');
}

// positioned text. opts: size, h (bold display), cls, color, w (width -> wraps), rot, align, raw (pre-built html)
export function T(id, x, y, text, o = {}) {
  const cls = ['a', o.w ? 'wrap' : 't', o.h ? 'h' : '', o.cls || ''].join(' ').trim();
  const style = [`left:${x}px`, `top:${y}px`, `font-size:${o.size || 44}px`];
  if (o.color) style.push(`color:${o.color}`);
  if (o.w) style.push(`width:${o.w}px`);
  if (o.align) style.push(`text-align:${o.align}`);
  if (o.lh) style.push(`line-height:${o.lh}`);
  // glyph boxes of rotated per-character spans overlap by construction (attribute is not inherited)
  const body = o.raw ?? chars(text, o.rot ? ' data-layout-allow-overlap' : '');
  const inner = o.rot ? `<div class="rot" style="transform:rotate(${o.rot}deg)">${body}</div>` : body;
  // per-character spans inside rotated text overlap by construction
  const allow = o.rot ? ' data-layout-allow-overlap' : '';
  return `<div id="@${id}" class="${cls}"${allow} style="${style.join(';')}">${inner}</div>`;
}

// highlighter span: HLS('hl1', 'Anything') -> animate with HL('#@hl1', at)
export const HLS = (id, text) =>
  `<span class="hlw"><span id="@${id}" class="hlbg"></span><span class="hltx">${chars(text)}</span></span>`;

// hand-drawn check mark
export const CK = (size = 40, color = C.ink) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 40 40" style="display:inline-block;vertical-align:-0.08em;margin-right:18px;overflow:visible"><path d="M5 22 L16 32 L36 7" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" /></svg>`;

// wobbled box with fill. content html goes inside .boxin
export function BOX(id, x, y, w, h, o = {}) {
  const fill = o.fill || C.card;
  const seed = o.seed || 1;
  return `<div id="@${id}" class="a" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">
  <div class="bo"><svg class="boxsvg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><path id="@${id}-p" class="dr" pathLength="1" d="${wobbleRect(w, h, Math.min(28, w * 0.1), seed)}" fill="${fill}" /></svg>
  <div id="@${id}-in" class="boxin" style="${o.inStyle || ''}">${o.html || ''}</div></div></div>`;
}

// sticky note with tape and soft offset shadow
export function STICKY(id, x, y, w, h, color, rot, html, o = {}) {
  return `<div id="@${id}" class="a sticky" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">
  <div class="rot" style="transform:rotate(${rot || 0}deg)"><div class="bo"><div class="paper" style="background:${color}"></div>${o.noTape ? '' : '<div class="tapebit"></div>'}
  <div class="sin" style="${o.inStyle || ''}">${html}</div></div></div></div>`;
}

export const TAPELBL = (id, x, y, text, rot, size = 48) =>
  `<div id="@${id}" class="a" style="left:${x}px;top:${y}px"><div class="rot" style="transform:rotate(${rot}deg)"><div class="tapelbl" style="font-size:${size}px">${esc(text)}</div></div></div>`;

// svg arrow inside an svg.full: quadratic from p0 via c to p1, head aligned to the end tangent
export function ARROW(id, p0, c, p1, o = {}) {
  const color = o.color || C.blue;
  const w = o.w || 5;
  const ang = Math.atan2(p1[1] - c[1], p1[0] - c[0]);
  const L = o.head || 22;
  const h1 = [p1[0] - L * Math.cos(ang - 0.5), p1[1] - L * Math.sin(ang - 0.5)];
  const h2 = [p1[0] - L * Math.cos(ang + 0.5), p1[1] - L * Math.sin(ang + 0.5)];
  const dash = o.dash ? ` stroke-dasharray="${o.dash}"` : '';
  const line = o.dash
    ? `<path id="@${id}" d="M ${p0.join(' ')} Q ${c.join(' ')} ${p1.join(' ')}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round"${dash} />`
    : `<path id="@${id}" class="dr" pathLength="1" d="M ${p0.join(' ')} Q ${c.join(' ')} ${p1.join(' ')}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" />`;
  return `${line}<path id="@${id}-h" d="M ${h1.map(f1).join(' ')} L ${p1.join(' ')} L ${h2.map(f1).join(' ')}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" />`;
}

// red marker circle (inside svg.full)
export const CIRCLE = (id, cx, cy, rx, ry, seed = 3, o = {}) =>
  `<path id="@${id}" class="dr" pathLength="1" d="${wobbleEllipse(cx, cy, rx, ry, seed, o.tilt ?? -3)}" fill="none" stroke="${o.color || C.red}" stroke-width="${o.w || 6}" stroke-linecap="round" />`;

// freehand underline (inside svg.full)
export const UNDER = (id, x0, x1, y, seed = 2, o = {}) => {
  const mid = (x0 + x1) / 2;
  const d = `M ${x0} ${y + hash(1, seed) * 4} Q ${f1(mid)} ${f1(y - 14 + hash(2, seed) * 4)} ${x1} ${f1(y + 4 + hash(3, seed) * 4)}`;
  return `<path id="@${id}" class="dr" pathLength="1" d="${d}" fill="none" stroke="${o.color || C.red}" stroke-width="${o.w || 8}" stroke-linecap="round" />`;
};

// magnifying glass (the film's hero prop), drawn in a 300×300 box
export const LENS = (id, x, y, size = 300) => `<div id="@${id}" class="a" style="left:${x}px;top:${y}px;width:${size}px;height:${size}px">
  <div class="bo"><svg width="${size}" height="${size}" viewBox="0 0 300 300" style="overflow:visible">
    <circle cx="120" cy="120" r="92" fill="rgba(246,207,74,0.22)" stroke="${C.ink}" stroke-width="10" />
    <path d="M58 92 Q70 62 100 52" fill="none" stroke="#FBF6EA" stroke-width="10" stroke-linecap="round" />
    <path d="M188 190 L278 282" stroke="${C.ink}" stroke-width="26" stroke-linecap="round" />
  </svg></div></div>`;

// terminal pill with a typed command
export const TERM = (id, x, y, w, cmd, size = 60) => `<div id="@${id}" class="a term" style="left:${x}px;top:${y}px;width:${w}px;font-size:${size}px">
  <div class="dots">● ● ●</div><span>$ </span>${[...cmd].map((c) => `<span class="tc">${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('')}<span id="@${id}-caret" class="caret"></span></div>`;

export const STAMP = (id, x, y, text, color, size = 34) =>
  `<div id="@${id}" class="a" style="left:${x}px;top:${y}px;color:${color}"><div class="rot" style="transform:rotate(-6deg)"><div class="stamp h" style="font-size:${size}px">${esc(text)}</div></div></div>`;

// small pencil doodles for ambient texture
export function DOODLE(id, kind, x, y, size = 60, color = C.soft) {
  const s = size;
  let d = '';
  if (kind === 'star') d = `M ${s / 2} 0 L ${s * 0.62} ${s * 0.38} L ${s} ${s * 0.4} L ${s * 0.7} ${s * 0.62} L ${s * 0.8} ${s} L ${s / 2} ${s * 0.78} L ${s * 0.2} ${s} L ${s * 0.3} ${s * 0.62} L 0 ${s * 0.4} L ${s * 0.38} ${s * 0.38} Z`;
  if (kind === 'spiral') d = `M ${s / 2} ${s / 2} q 6 -8 12 0 q 6 14 -12 18 q -22 2 -22 -18 q 2 -26 30 -26 q 32 2 32 32`;
  if (kind === 'squiggle') d = `M 0 ${s / 2} q ${s / 8} -${s / 3} ${s / 4} 0 t ${s / 4} 0 t ${s / 4} 0 t ${s / 4} 0`;
  if (kind === 'plus') d = `M ${s / 2} 0 V ${s} M 0 ${s / 2} H ${s}`;
  return `<div id="@${id}" class="a" data-layout-ignore style="left:${x}px;top:${y}px;width:${s}px;height:${s}px"><div class="bo"><svg width="${s}" height="${s}" style="overflow:visible"><path d="${d}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity="0.75" /></svg></div></div>`;
}

// ---------- runtime JS helpers (injected into every scene timeline) ----------
export const COMMON_JS = (id, dur, o) => `
const D = ${dur};
const L = ${o.lead};
const c = (t) => L + t;
const STAGE = '#${id} .stage';
const NEUTRAL = { opacity: 1, x: 0, y: 0, scale: 1, scaleX: 1, scaleY: 1, rotation: 0, strokeDashoffset: 0 };
function IN(sel, from, at, dur, ease, extra) {
  const to = Object.assign({ duration: dur || 0.6, ease: ease || 'power3.out' }, extra || {});
  if (to.transformOrigin) from = Object.assign({ transformOrigin: to.transformOrigin }, from);
  for (const k in from) if (k in NEUTRAL) to[k] = NEUTRAL[k];
  return tl.fromTo(sel, from, to, at);
}
function SHOW(sel, at, dur) { return tl.fromTo(sel, { opacity: 0 }, { opacity: 1, duration: dur || 0.5, ease: 'power1.inOut' }, at); }
function OUT(sel, at, dur) { return tl.to(sel, { opacity: 0, duration: dur || 0.5, ease: 'power1.inOut' }, at); }
function POP(sel, at, dur, over) { return tl.fromTo(sel, { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: dur || 0.55, ease: 'back.out(' + (over || 2) + ')' }, at); }
function SLAP(sel, at) { return tl.fromTo(sel, { opacity: 0, scale: 1.25, y: -30 }, { opacity: 1, scale: 1, y: 0, duration: 0.42, ease: 'back.out(1.6)' }, at); }
// handwriting: characters appear left to right
function WRITE(sel, at, dur) {
  dur = dur || 1;
  tl.fromTo(sel + ' .ch', { opacity: 0 }, { opacity: 1, duration: 0.12, ease: 'none', stagger: { amount: Math.max(0.01, dur - 0.12) } }, at);
}
// stroke draw-on for paths with pathLength=1 (class "dr")
function DRAW(sel, at, dur, ease) {
  tl.fromTo(sel, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: dur || 0.9, ease: ease || 'power2.inOut' }, at);
}
// box: outline draws while the fill fades in, then the content shows
function BOXIN(sel, at, dur) {
  dur = dur || 0.8;
  DRAW(sel + '-p', at, dur);
  tl.fromTo(sel + '-p', { fillOpacity: 0 }, { fillOpacity: 1, duration: dur * 0.8, ease: 'power1.inOut' }, at + dur * 0.35);
  tl.fromTo(sel + '-in', { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power1.out' }, at + dur * 0.6);
}
function ARR(sel, at, dur) {
  dur = dur || 0.6;
  if (document.querySelector(sel) && document.querySelector(sel).classList.contains('dr')) DRAW(sel, at, dur);
  else tl.fromTo(sel, { opacity: 0 }, { opacity: 1, duration: dur * 0.6 }, at);
  tl.fromTo(sel + '-h', { opacity: 0 }, { opacity: 1, duration: 0.12 }, at + dur * 0.85);
}
function HL(sel, at, dur) { return tl.fromTo(sel, { scaleX: 0 }, { scaleX: 1, duration: dur || 0.6, ease: 'power2.inOut' }, at); }
// typing: reveal terminal characters one by one, caret rides the end
function TYPE(sel, at, dur) {
  const cs = gsap.utils.toArray(sel + ' .tc');
  cs.forEach((el, i) => tl.set(el, { display: 'inline' }, at + (i / cs.length) * dur));
}
function BLINK(sel, from, to) {
  const n = Math.max(1, Math.floor((to - from) / 0.5));
  tl.fromTo(sel, { opacity: 1 }, { opacity: 0, duration: 0.5, ease: 'steps(1)', repeat: n - 1, yoyo: true }, from);
}
// count-up: text is a pure function of tween progress (seek-safe)
function COUNT(sel, from, to, at, dur, grow) {
  const el = document.querySelector(sel);
  const fmt = (v) => Math.round(v).toLocaleString('en-US');
  const st = { v: from };
  el.textContent = fmt(from);
  tl.fromTo(st, { v: from }, { v: to, duration: dur, ease: 'power2.out', onUpdate: () => { el.textContent = fmt(st.v); } }, at);
  if (grow) tl.fromTo(sel, { scale: 0.7 }, { scale: 1, duration: dur, ease: 'power2.out', transformOrigin: grow }, at);
}
// camera on the .world wrapper: centre (x, y) at scale s
function CAM(at, x, y, s, dur, ease) {
  return tl.to('#${id}-world', { x: 960 - x * s, y: 470 - y * s, scale: s, duration: dur, ease: ease || 'power2.inOut' }, at);
}
function CAMSET(x, y, s) { tl.set('#${id}-world', { x: 960 - x * s, y: 470 - y * s, scale: s }, 0); }
// hand-drawn "boil": every .bo jitters on a quantized clock (deterministic, seek-safe)
function BOIL(amp, rot) {
  const els = gsap.utils.toArray('#${id} .bo');
  const h = (n, s) => { const x = Math.sin(n * 127.1 + s * 311.7) * 43758.5453; return (x - Math.floor(x)) * 2 - 1; };
  const apply = () => {
    const step = Math.floor(tl.time() * 30 / 4);
    for (let i = 0; i < els.length; i++) {
      gsap.set(els[i], { x: h(step * 3 + i * 97, 7) * (amp || 1.2), y: h(step * 3 + 1 + i * 97, 7) * (amp || 1.2), rotation: h(step * 3 + 2 + i * 97, 7) * (rot || 0.35) });
    }
  };
  tl.eventCallback('onUpdate', apply);
  apply();
}
// scene-to-scene handoffs: the notebook slides left; the grid lines up across the seam
const PUSH = ${o.push};
${o.transIn === 'push' ? `tl.fromTo(STAGE, { x: 1920 }, { x: 0, duration: PUSH, ease: 'power2.inOut' }, 0);` : ''}
${o.transIn === 'fade' ? `tl.fromTo(STAGE, { opacity: 0 }, { opacity: 1, duration: ${o.xfade}, ease: 'power1.inOut' }, 0);` : ''}
${o.transOut === 'push' ? `tl.fromTo(STAGE, { x: 0 }, { x: -1920, duration: PUSH, ease: 'power2.inOut', immediateRender: false }, D - PUSH);` : ''}
`;
