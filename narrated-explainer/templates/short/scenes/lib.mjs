// Vertical card style (1080x1920): ruled paper or deep green, white cards with black outlines,
// mono labels, stat cards and rotated stamps. Ids written '@name' become 'sNN-name'.
export const W = 1080;
export const H = 1920;

export const C = {
  paper: '#F3F3EE',
  rule: '#E3E3DC',
  dot: '#D2D2CB',
  ink: '#141414',
  soft: '#8C8C86',
  faint: '#CFCFC8',
  card: '#FFFFFF',
  gray: '#D5D5CF',
  green: '#09544B',
  greenHi: '#0E7364',
  mint: '#DDEFE8',
  light: '#EEF4F1',
  red: '#C8402E',
  pill: '#3A3A3A',
};

export const FONT_FACES = (prefix) => `
@font-face { font-family: "Noto Sans"; src: url("${prefix}fonts/noto-sans-latin-vf.woff2") format("woff2"); font-weight: 100 900; }
@font-face { font-family: "JB Mono"; src: url("${prefix}fonts/jetbrains-mono-400.woff2") format("woff2"); font-weight: 400; }`;

export const PAPER_BG = `background-color: ${C.paper};
  background-image: radial-gradient(circle at 40px 32px, ${C.dot} 0 6px, transparent 7px),
    repeating-linear-gradient(to bottom, transparent 0 62px, ${C.rule} 62px 64px);
  background-size: 80px 64px, 100% 64px; background-repeat: repeat-y, repeat;`;

export const GREEN_BG = `background-color: ${C.green};
  background-image: repeating-linear-gradient(to bottom, transparent 0 62px, rgba(255,255,255,0.04) 62px 64px);`;

export const COMMON_CSS = `
$S { position: absolute; inset: 0; }
$S .stage { position: absolute; inset: 0; overflow: hidden; color: ${C.ink}; font-family: "Noto Sans", sans-serif; font-weight: 500; }
$S .stage.paper { ${PAPER_BG} }
$S .stage.green { ${GREEN_BG} color: ${C.light}; }
$S .a { position: absolute; }
$S .t { white-space: nowrap; line-height: 1.2; }
$S .wrap { white-space: normal; }
$S .b { font-weight: 800; }
$S .mono { font-family: "JB Mono", monospace; font-weight: 400; }
$S .soft { color: ${C.soft}; }
$S .card { background: ${C.card}; color: ${C.ink}; border: 4px solid ${C.ink}; border-radius: 18px; }
$S .card.dark { background: ${C.ink}; color: #fff; }
$S .card.gray { background: ${C.gray}; }
$S .card.dash { background: transparent; border-style: dashed; border-color: ${C.soft}; }
$S .green .card.line { background: transparent; color: ${C.light}; border-color: ${C.light}; }
$S .green .card.dash { color: ${C.light}; border-color: rgba(238,244,241,0.55); }
$S .cin { position: absolute; inset: 0; padding: 22px 30px; }
$S .ctr { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
$S .num { font-family: "JB Mono", monospace; color: ${C.soft}; }
$S .stamp { border: 6px solid ${C.green}; color: ${C.green}; background: #DDEFE8; border-radius: 12px;
  padding: 2px 22px 6px; font-weight: 900; white-space: nowrap; line-height: 1.15; box-shadow: 0 4px 0 rgba(9,84,75,0.18); }
$S .stamp.red { border-color: ${C.red}; color: ${C.red}; background: #FAE8E4; box-shadow: 0 4px 0 rgba(200,64,46,0.18); }
$S .tag { border: 3px solid ${C.ink}; border-radius: 10px; background: ${C.card}; padding: 6px 16px; font-family: "JB Mono", monospace; white-space: nowrap; }
$S .tag.inv { background: ${C.ink}; color: #fff; }
$S .tag.mint { background: ${C.mint}; border-color: ${C.green}; color: ${C.green}; }
$S .frame { border: 14px solid ${C.ink}; border-radius: 40px; overflow: hidden; background: ${C.ink}; }
$S .frame img { display: block; width: 100%; height: 100%; object-fit: cover; }
$S .hl { background: linear-gradient(transparent 52%, ${C.mint} 52%); color: ${C.green}; font-weight: 800; }
$S .strike { position: absolute; left: -4%; right: -4%; top: 50%; height: 7px; margin-top: -3px; background: ${C.red}; border-radius: 4px; transform-origin: 0 50%; }
$S svg.full { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; overflow: visible; pointer-events: none; }
$S svg.full path { fill: none; stroke: ${C.ink}; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; }
$S .green svg.full path { stroke: ${C.light}; }
$S svg.full path.dsh { stroke-dasharray: 10 10; }
$S .dr { stroke-dasharray: 1 2; }
`;

const UNITLESS = new Set(['line-height', 'opacity', 'z-index', 'font-weight']);
const px = (k, v) => (typeof v === 'number' && !UNITLESS.has(k) ? `${v}px` : v);
const style = (o) => Object.entries(o).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => `${k}:${px(k, v)}`).join(';');

export function T(id, x, y, text, o = {}) {
  const cls = ['a', 't', o.w ? 'wrap' : '', o.b ? 'b' : '', o.mono ? 'mono' : '', o.soft ? 'soft' : '', o.cls || ''].filter(Boolean).join(' ');
  const s = style({ left: x, top: y, width: o.w, 'font-size': o.size || 40, color: o.color, 'text-align': o.align, 'line-height': o.lh, 'letter-spacing': o.ls, transform: o.rot ? `rotate(${o.rot}deg)` : undefined });
  return `<div id="@${id}" class="${cls}" style="${s}">${text}</div>`;
}

export function CARD(id, x, y, w, h, html, o = {}) {
  const cls = ['a', 'card', o.kind || ''].filter(Boolean).join(' ');
  const s = style({ left: x, top: y, width: w, height: h, transform: o.rot ? `rotate(${o.rot}deg)` : undefined, 'border-radius': o.r });
  return `<div id="@${id}" class="${cls}" style="${s}"><div class="cin${o.ctr ? ' ctr' : ''}" style="${o.pad ? `padding:${o.pad};` : ''}${h == null ? 'position:relative' : ''}">${html}</div></div>`;
}

export function TITLECARD(id, y, num, title, sub, credit) {
  return CARD(id, 60, y, 960, 150, `
    <div class="a num" style="left:30px;top:50px;font-size:40px">${num}</div>
    <div class="a t b" style="left:120px;top:18px;font-size:50px">${title}</div>
    <div class="a t mono soft" style="left:122px;top:88px;font-size:30px">${sub}</div>
    <div class="a t b" style="right:28px;top:30px;font-size:30px;text-align:right;line-height:1.45">${credit}</div>`);
}

export function STAT(id, x, y, w, h, big, unit, cap, o = {}) {
  return CARD(id, x, y, w, h, `
    <div class="t b" style="font-size:${o.size || 110}px;line-height:1"><span id="@${id}-n">${big}</span><span style="font-size:${o.usize || 46}px;margin-left:8px">${unit}</span></div>
    <div class="t b soft" style="font-size:${o.csize || 32}px;margin-top:14px">${cap}</div>`, { pad: '26px 30px', kind: o.kind });
}

export const SRC = (id, x, y, text, o = {}) => T(id, x, y, text, { size: 28, mono: true, soft: true, ...o });

export function STAMP(id, x, y, text, o = {}) {
  const s = style({ left: x, top: y, 'font-size': o.size || 60, transform: `rotate(${o.rot ?? -8}deg)` });
  return `<div id="@${id}" class="a stamp${o.red ? ' red' : ''}" style="${s}">${text}</div>`;
}

export function TAG(id, x, y, text, o = {}) {
  const s = style({ left: x, top: y, 'font-size': o.size || 30 });
  return `<div id="@${id}" class="a tag${o.kind ? ' ' + o.kind : ''}" style="${s}">${text}</div>`;
}

export function FRAME(id, x, y, w, h, src, o = {}) {
  const s = style({ left: x, top: y, width: w, height: h, 'border-width': o.bw, 'border-radius': o.r });
  return `<div id="@${id}" class="a frame" style="${s}"><img src="${src}" alt="" />${o.html || ''}</div>`;
}

export function TWEET(id, x, y, w, name, handle, body, foot) {
  return CARD(id, x, y, w, null, `
    <div style="display:flex;align-items:center;gap:18px">
      <div style="width:64px;height:64px;border-radius:50%;background:${C.ink};color:#fff;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:800">${name[0]}</div>
      <div><div class="t b" style="font-size:34px">${name}</div><div class="t mono soft" style="font-size:24px">${handle}</div></div>
    </div>
    <div class="wrap" style="font-size:36px;line-height:1.45;margin-top:16px">${body}</div>
    ${foot ? `<div class="t mono soft" style="font-size:24px;margin-top:14px">${foot}</div>` : ''}`, { pad: '26px 32px 24px' });
}

export const STRIKE = (id) => `<div id="@${id}" class="strike"></div>`;

export const SVG = (inner) => `<svg class="full" viewBox="0 0 ${W} ${H}">${inner}</svg>`;

export function LINE(id, pts, o = {}) {
  const d = 'M' + pts.map((p) => p.join(' ')).join(' L');
  const s = style({ stroke: o.color, 'stroke-width': o.sw });
  return `<path id="@${id}" class="${o.dash ? 'dsh' : 'dr'}" d="${d}" pathLength="1" style="${s}" />`;
}

export function HEAD(id, x, y, ang, o = {}) {
  const r = (a) => [x + 22 * Math.cos(a), y + 22 * Math.sin(a)];
  const a1 = r(ang + Math.PI * 0.82);
  const a2 = r(ang - Math.PI * 0.82);
  const s = style({ stroke: o.color, 'stroke-width': o.sw });
  return `<path id="@${id}" d="M${a1.join(' ')} L${x} ${y} L${a2.join(' ')}" style="${s}" />`;
}

export const COMMON_JS = (id, dur, lead) => `
const D = ${dur};
const L = ${lead};
const c = (t) => L + t;
function POP(sel, at, dur) { return tl.fromTo(sel, { opacity: 0, scale: 0.86 }, { opacity: 1, scale: 1, duration: dur || 0.38, ease: 'back.out(1.8)' }, at); }
function UP(sel, at, dur, dy) { return tl.fromTo(sel, { opacity: 0, y: dy || 40 }, { opacity: 1, y: 0, duration: dur || 0.42, ease: 'power3.out' }, at); }
function SHOW(sel, at, dur) { return tl.fromTo(sel, { opacity: 0 }, { opacity: 1, duration: dur || 0.3, ease: 'power1.out' }, at); }
function OUT(sel, at, dur) { return tl.to(sel, { opacity: 0, duration: dur || 0.3, ease: 'power1.in' }, at); }
function DIM(sel, at, v) { return tl.to(sel, { opacity: v ?? 0.3, duration: 0.3, ease: 'power1.inOut' }, at); }
function SLAM(sel, at) { return tl.fromTo(sel, { opacity: 0, scale: 1.9 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'power3.in' }, at); }
function DRAW(sel, at, dur, ease) { return tl.fromTo(sel, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: dur || 0.5, ease: ease || 'power2.inOut' }, at); }
function GROWX(sel, at, dur) { return tl.fromTo(sel, { scaleX: 0 }, { scaleX: 1, duration: dur || 0.4, ease: 'power2.out', transformOrigin: '0% 50%' }, at); }
function GROWY(sel, at, dur) { return tl.fromTo(sel, { scaleY: 0 }, { scaleY: 1, duration: dur || 0.4, ease: 'power2.out', transformOrigin: '50% 100%' }, at); }
function STAGGER(sel, at, each, how) {
  gsap.utils.toArray(sel).forEach((el, i) => (how || POP)(el, at + i * each));
}
function COUNT(sel, from, to, at, dur, dec) {
  const el = document.querySelector(sel);
  const fmt = (v) => (dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US'));
  const st = { v: from };
  el.textContent = fmt(from);
  tl.fromTo(st, { v: from }, { v: to, duration: dur || 1, ease: 'power2.out', onUpdate: () => { el.textContent = fmt(st.v); } }, at);
}
`;
