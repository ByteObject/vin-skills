---
name: codex-cu
description: Operate Windows desktop apps in the background (real clicks and keystrokes, without moving the user's cursor) through Codex's computer-use engine, exposed as the `codex-cu` MCP server. Use when the user types /codex-cu, says "use codex-cu", or asks to control a desktop app ("open Calculator and…", "click … in Notepad", "fill this form in <app>"). Installs and registers the server on first use if it is missing.
---

# codex-cu: Codex computer use from Claude Code (Windows)

`codex-cu` runs Codex's own computer-use engine (`cua_repl`) via `scripts/codex-cu.mjs`. The
launcher reads the newest `~/.codex/plugins/cache/openai-bundled/unified-computer-use/<ver>/.mcp.json`
on each start and enables the native `computer` surface. It is unofficial: a Codex update can
break it.

## 1. Make sure it is installed

```bash
claude mcp get codex-cu
```

- If it shows `✔ Connected`, go to step 2.
- If it's missing, register this skill's launcher. Use the full path to `node`, which you get
  from `(Get-Command node).Source` in PowerShell or `which node` in bash:

  ```powershell
  claude mcp add --scope user codex-cu -- "<path-to-node.exe>" "$env:USERPROFILE\.claude\skills\codex-cu\scripts\codex-cu.mjs"
  ```

  If `~/.codex/plugins/cache/openai-bundled/unified-computer-use` doesn't exist, stop and tell
  the user to install the Codex desktop app (Microsoft Store), sign in, and enable Computer Use.

## 2. Make sure the Codex desktop app is running

The engine only works while the app runs, because the app serves the
`\\.\pipe\codex-computer-use-<GUID>` pipe and the sandbox. Check, and launch the app if needed:

```powershell
if (-not ([System.IO.Directory]::GetFiles("\\.\pipe\") -match "codex-computer-use")) {
  Start-Process explorer.exe "shell:AppsFolder\OpenAI.Codex_2p2nqsd0c76g0!App"
  for ($i = 0; $i -lt 30 -and -not ([System.IO.Directory]::GetFiles("\\.\pipe\") -match "codex-computer-use")); $i++) { Start-Sleep 2 }
}
[System.IO.Directory]::GetFiles("\\.\pipe\") -match "codex-computer-use"
```

## 3. Choose how to call it

- **The `codex-cu` tools are loaded in this session** (check with ToolSearch for `codex-cu`):
  call its `js` tool directly.
- **They aren't loaded** (the server was registered after this session started): use the
  bundled client. Each `-e` or file argument is one `js` call in the same engine session:

  ```bash
  node ~/.claude/skills/codex-cu/scripts/cu.mjs --allow "Calculator" --out <scratch-dir> -e "<code>"
  ```

  Screenshots emitted by the code are saved as `<out>/shot-N.png`; Read them to see the result.

## 4. Permission prompts

Every new app triggers **"Allow Codex to use <App>?"**:
- Through the MCP tools, Claude Code shows this prompt to the user.
- Through `cu.mjs`, it's declined unless the app is named in `--allow`. Only list apps the user
  asked for or approved in this conversation.

Confirm with the user before actions that send, delete, buy, post, or change settings.

## 5. Windows API: what works

- **Output:** results only come back through `console.log`. The first call in a new engine
  session returns just an instruction banner (`cu.mjs` sends that warm-up call for you).
- **Finding apps:** `cua.getApp` needs `{ windowId }`, not a name. Get one from
  `cua.listWindows()` or `cua.listApps()` (each app there has a `windows` list).
- **Launching:** `cua.computer.launch_app({ app: "<AUMID or full .exe path>" })`, then wait about
  2–3 s and call `listWindows()`. Store apps use an AUMID such as
  `Microsoft.WindowsCalculator_8wekyb3d8bbwe!App`; find one with
  `Get-StartApps | ? Name -match "<name>"` in PowerShell.
- **App methods:** `getAXState()`, `getAXStateAndScreenshot()`, `getScreenshot({ emit: true })`,
  `click(indexOrXY)`, `drag(from, to)`, `scroll(target, dir, pages)`, `typeText(text)`,
  `pressKey("ctrl+a")`, `setValue(index, value)`, `paste(text)`, `selectText(...)`,
  `performSecondaryAction(index, action)`.
- **Reading the UI:** prefer `getAXState()`, which returns indexed elements you can `click(index)`.
  Some apps (Calculator, for example) return "Accessibility state unavailable"; for those, use
  keyboard input and read the screenshot.
- **Limitations:** there's no hover.

Working example (verified: 12 × 12 = 144):

```javascript
await cua.computer.launch_app({ app: "Microsoft.WindowsCalculator_8wekyb3d8bbwe!App" });
await new Promise((r) => setTimeout(r, 3000));
const w = (await cua.listWindows()).find((x) => /Calculator/.test(String(x.app)));
const app = await cua.getApp({ windowId: w.id });
await app.pressKey("Escape");
await app.typeText("12*12=");
await app.getScreenshot({ emit: true });
console.log("window", w.id);
```

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `CreateProcessWithLogonW failed: 1056`, or `engine exited … before answering` | The Codex app isn't running: do step 2. |
| `cua` has no `getApp` or `listWindows` | The server isn't using this launcher: re-register it (step 1). |
| `getApp requires { windowId }` | Look up the window with `listWindows()` first. |
| `cua_repl command missing` after a Codex update | Open the Codex app so it finishes updating, then retry. |
| `[approval] … DECLINED` from `cu.mjs` | Ask the user, then pass the app name with `--allow`. |
