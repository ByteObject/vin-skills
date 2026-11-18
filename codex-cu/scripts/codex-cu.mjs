// Launcher for Codex's computer-use MCP server ("cua_repl") on Windows, for use from Claude Code.
//
// Every start it reads the cua_repl entry from the NEWEST
// ~/.codex/plugins/cache/openai-bundled/unified-computer-use/<version>/.mcp.json, so Codex app
// updates (new runtime dir, new pipe GUID) don't break it, then applies the Windows fixups:
//   - enable the native "computer" surface (the bundled entry only enables "browser")
//   - add the "sky" (desktop) service to NODE_REPL_TRUSTED_SERVICES
// Requires the Codex desktop app to be running: it serves the computer-use pipe and the sandbox.
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const fail = (msg) => {
  process.stderr.write(`[codex-cu] ${msg}\n`);
  process.exit(1);
};

const base = join(homedir(), '.codex', 'plugins', 'cache', 'openai-bundled', 'unified-computer-use');
if (!existsSync(base)) fail(`not found: ${base} (is the Codex app installed?)`);
const byVersion = (a, b) => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  return 0;
};
const versions = readdirSync(base).filter((v) => existsSync(join(base, v, '.mcp.json'))).sort(byVersion);
if (!versions.length) fail(`no .mcp.json under ${base}`);
const newest = versions[versions.length - 1];

let entry;
try {
  entry = JSON.parse(readFileSync(join(base, newest, '.mcp.json'), 'utf8')).mcpServers.cua_repl;
} catch (err) {
  fail(`cannot read cua_repl from ${newest}/.mcp.json: ${err.message}`);
}
if (!entry || !existsSync(entry.command)) fail(`cua_repl command missing for ${newest}: ${entry && entry.command}`);

const env = { ...process.env, ...entry.env };
const surfaces = new Set(String(env.CUA_REPL_ENABLED_SURFACES || 'browser').split(',').map((s) => s.trim()).filter(Boolean));
surfaces.add('computer');
env.CUA_REPL_ENABLED_SURFACES = [...surfaces].join(',');
let services = {};
try {
  services = JSON.parse(env.NODE_REPL_TRUSTED_SERVICES || '{}');
} catch {
  /* fall back to defaults below */
}
services.browser = services.browser || '@oai/browser-desktop/service';
services.sky = services.sky || '@oai/sky/service';
env.NODE_REPL_TRUSTED_SERVICES = JSON.stringify(services);

const pipe = env.SKY_CUA_NATIVE_PIPE_DIRECTORY;
if (pipe && !existsSync(pipe)) {
  process.stderr.write(`[codex-cu] warning: ${pipe} is not open; start the Codex desktop app for computer use.\n`);
}

const child = spawn(entry.command, entry.args || [], { env, stdio: 'inherit', windowsHide: true });
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
child.on('error', (err) => fail(`failed to start cua_repl: ${err.message}`));
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 1)));
