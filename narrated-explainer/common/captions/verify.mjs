import { readFileSync, writeFileSync } from 'node:fs';
import { CUES } from './cues.mjs';
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
let bad = 0; const zh = new Set();
for (const [id, cues] of Object.entries(CUES)) {
  const said = norm(readFileSync(`narration/${id}.txt`, 'utf8'));
  const cued = norm(cues.map((c) => c.sp ?? c.en).join(' '));
  if (said !== cued) { bad++; console.log(`MISMATCH ${id}\n  txt: ${said}\n  cue: ${cued}`); }
  cues.forEach((c) => [...c.zh].forEach((ch) => zh.add(ch)));
}
let ascii = ''; for (let i = 32; i < 127; i++) ascii += String.fromCharCode(i);
writeFileSync('captions/zh-chars.txt', [...zh].join('') + ascii + '“”‘’「」『』—…·，。、：；！？（）');
process.exitCode = bad ? 1 : 0;
console.log(bad ? `${bad} mismatches` : 'all cues match narration', '| zh chars:', zh.size);
