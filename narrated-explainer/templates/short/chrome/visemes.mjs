// Mouth shapes from word timings: one shape per vowel group, a short close between syllables,
// rest in pauses, and blinks placed where the mouth is at rest.
const VOWELS = /[aeiouy]+/g;
const SYL = 0.11;
const BLINK = 0.13;
const BLINK_GAPS = [3.2, 4.1, 2.7, 3.8, 3.4];

const shapeOf = (g) => {
  if (/[ou]/.test(g) && !/[ei]/.test(g)) return 'o';
  if (/a/.test(g)) return 'open';
  if (/(ee|i|y)/.test(g)) return 'teeth';
  return 'wide';
};

function mouthEvents(clips) {
  const ev = [[0, 'rest']];
  for (const { words, offset } of clips) {
    words.forEach((w, i) => {
      const s = offset + w.start;
      const e = offset + w.end;
      const groups = w.text.toLowerCase().match(VOWELS) || ['a'];
      const n = Math.max(1, Math.min(groups.length, Math.floor((e - s) / SYL)));
      const d = (e - s) / n;
      for (let k = 0; k < n; k++) {
        ev.push([s + d * k, shapeOf(groups[k])]);
        if (d > 0.15 && k < n - 1) ev.push([s + d * k + d * 0.72, 'rest']);
      }
      const next = words[i + 1];
      if (!next || offset + next.start - e > 0.07) ev.push([e, 'rest']);
    });
  }
  return ev.sort((a, b) => a[0] - b[0]);
}

const stateAt = (ev, t) => {
  let s = 'rest';
  for (const [et, name] of ev) {
    if (et > t) break;
    s = name;
  }
  return s;
};

const restDuring = (ev, t0, t1) => stateAt(ev, t0) === 'rest' && !ev.some(([t]) => t > t0 && t < t1);

export function visemeTrack(clips, total) {
  const mouth = mouthEvents(clips);
  const blinks = [];
  let target = 1.6;
  for (let i = 0; target < total - 0.5; i++) {
    for (let t = target; t < target + 2.5 && t < total - 0.3; t += 0.05) {
      if (restDuring(mouth, t, t + BLINK)) {
        blinks.push([t, 'blink'], [t + BLINK, 'rest']);
        break;
      }
    }
    target += BLINK_GAPS[i % BLINK_GAPS.length];
  }
  const all = [...mouth, ...blinks].sort((a, b) => a[0] - b[0]);
  const out = [];
  for (const [t, name] of all) {
    const tt = Math.round(t * 1000) / 1000;
    if (out.length && out[out.length - 1][1] === name) continue;
    if (out.length && out[out.length - 1][0] === tt) out[out.length - 1][1] = name;
    else out.push([tt, name]);
  }
  return out.filter((e, i) => i === 0 || e[1] !== out[i - 1][1]);
}
