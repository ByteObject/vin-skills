// Run JavaScript against the codex-cu computer-use engine without the MCP tools being loaded
// in the current Claude Code session (e.g. right after registering it).
//
// Usage:
//   node cu.mjs [--allow "Calculator,Notepad"] [--out <dir>] (-e "<code>" | <file.js>)...
//
// Each -e / file is one `js` tool call in the same engine session (state persists between them).
// Results come back only through console.log. Screenshots emitted with
// app.getScreenshot({ emit: true }) are saved as <out>/shot-N.png.
// "Allow Codex to use <App>?" approvals are accepted ONLY for apps named in --allow;
// everything else is declined, so get the user's OK first and pass it explicitly.
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const calls = [];
let allow = [];
let out = process.cwd();
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--allow') allow = args[++i].split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  else if (args[i] === '--out') out = resolve(args[++i]);
  else if (args[i] === '-e') calls.push(args[++i]);
  else calls.push(readFileSync(args[i], 'utf8'));
}
if (!calls.length) {
  console.error('usage: node cu.mjs [--allow "App1,App2"] [--out dir] (-e "<code>" | file.js)...');
  process.exit(2);
}
mkdirSync(out, { recursive: true });

const server = spawn(process.execPath, [join(here, 'codex-cu.mjs')], { stdio: ['pipe', 'pipe', 'pipe'] });
let buf = '';
const pending = new Map();
const send = (msg) => server.stdin.write(JSON.stringify({ jsonrpc: '2.0', ...msg }) + '\n');

function onApproval(m) {
  const meta = m.params?._meta || {};
  const shown = (meta.tool_params_display || []).map((p) => p.value).join(' ');
  const label = `${shown} ${JSON.stringify(meta.tool_params || {})}`.toLowerCase();
  const ok = allow.some((a) => label.includes(a));
  console.log(`[approval] "${m.params?.message}" -> ${ok ? 'accepted (--allow)' : 'DECLINED (not in --allow)'}`);
  send({ id: m.id, result: ok ? { action: 'accept', content: {} } : { action: 'decline' } });
}

server.stdout.on('data', (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    let m;
    try {
      m = JSON.parse(line);
    } catch {
      continue;
    }
    if (m.id != null && pending.has(m.id) && !m.method) {
      pending.get(m.id)(m);
      pending.delete(m.id);
    } else if (m.method === 'elicitation/create') onApproval(m);
    else if (m.id != null && m.method) send({ id: m.id, error: { code: -32601, message: 'not supported' } });
  }
});
server.stderr.on('data', (d) => {
  const s = String(d);
  if (/codex-cu|error|failed/i.test(s)) process.stderr.write(s.slice(0, 800));
});
server.on('exit', (code) => {
  if (pending.size) {
    console.error(`[cu] engine exited (code ${code}) before answering. Is the Codex desktop app running?`);
    process.exit(1);
  }
});

let id = 0;
const rpc = (method, params) =>
  new Promise((res) => {
    const n = ++id;
    pending.set(n, res);
    send({ id: n, method, params });
  });
const timer = setTimeout(() => {
  console.error('[cu] timed out after 180s');
  server.kill();
  process.exit(2);
}, 180000);

await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: { elicitation: {} }, clientInfo: { name: 'codex-cu-skill', version: '1' } });
send({ method: 'notifications/initialized' });
await rpc('tools/call', { name: 'js', arguments: { code: '1' } }); // first call only returns the banner

let shot = 0;
let failed = false;
for (const code of calls) {
  const r = await rpc('tools/call', { name: 'js', arguments: { code } });
  const parts = (r.result?.content || []).map((c) => {
    if (c.type === 'image') {
      const f = join(out, `shot-${++shot}.png`);
      writeFileSync(f, Buffer.from(c.data, 'base64'));
      return `[screenshot saved: ${f}]`;
    }
    return c.type === 'text' ? c.text : `[${c.type}]`;
  });
  if (r.result?.isError || r.error) failed = true;
  console.log(`--- call ${calls.indexOf(code) + 1}${r.result?.isError ? ' (error)' : ''}:\n${parts.join('\n')}${r.error ? JSON.stringify(r.error) : ''}`);
}
clearTimeout(timer);
server.kill();
process.exit(failed ? 1 : 0);
