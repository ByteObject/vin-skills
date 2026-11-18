# Troubleshooting & details

## Error → cause → fix

| Symptom | Cause | Fix |
|---|---|---|
| `Join this channel to get access` / `members-only` | Not authenticated, or cookies invalid/expired | Provide fresh incognito cookies; run `-Gated`. |
| `The provided YouTube account cookies are no longer valid` | Cookies rotated by the live browser session | Re-export from a **closed** incognito session (see below); run again immediately. |
| Only `sb0..sb3` storyboards listed / `Only images are available` / `Requested format is not available` | PO token + n-challenge not solved | Need bgutil server **and** `--remote-components ejs:github` (the script adds both in the gated tier). |
| `The page needs to be reloaded` | Player client mismatch / PO token enforcement | Use `web_safari` client (default) + PO token; avoid `tv`/`tv_embedded`. |
| `[pot:bgutil:http] Error reaching ... 127.0.0.1:4416` | Server bound to IPv6 only | Use base_url `http://[::1]:4416` (the script does this). |
| bgutil script `... timed out after 15.0 seconds` | deno cold-start exceeds the per-call script timeout | Use the **HTTP server** mode (script default), not script mode. |
| `node-pty` / `Could not copy Chrome cookie database` | Tried `--cookies-from-browser chrome` while Chrome runs / ABE | Don't pull from the browser; use an exported incognito cookies.txt. |

## Getting cookies that don't rotate (critical)

YouTube rotates `__Secure-*PSIDTS` / `SIDCC` while the browser keeps using the account, which kills an exported snapshot. Export from a session that is then abandoned:

1. Open **Incognito** (`Ctrl+Shift+N`). Allow the cookie-export extension in incognito (`chrome://extensions` → Details → Allow in Incognito).
2. Sign in to YouTube with the **membership** account; open the target video to confirm access.
3. Export **youtube.com** cookies as **Netscape** format to a `.txt` file.
4. **Close the entire incognito window immediately** — do not browse further.
5. Use that file right away with `-Cookies <path> -Gated`.

Cookie file must be tab-separated Netscape format (what extensions produce). If you only have a space-separated paste, convert each non-comment line by splitting on whitespace and rejoining with tabs.

After a successful download, **delete the cookies file** — it grants full Google account access.

## Why three pieces are needed

- **Cookies** → prove membership (auth). Without them: "members-only".
- **PO token** (bgutil, GVS token) → proves a "real" client. Without it: only storyboards.
- **EJS solver** → solves YouTube's "n" signature challenge so stream URLs decipher. yt-dlp's built-in JS interpreter can't handle current players; it runs the downloaded solver in deno.

## Format / quality notes

- `web_safari` (default for gated) exposes **HLS (m3u8)** variants, commonly up to 1080p, often muxed (video+audio in one stream → no separate merge).
- For >1080p (1440p/4K) on public videos, drop `-PlayerClient web_safari` (let the default/`web` client expose DASH), then `-Quality 2160`.
- `-Quality N` maps to `-S res:N` (closest at or below N). `-Format` overrides with an explicit selector or format id (e.g. `96`, `bestvideo+bestaudio`).

## Server lifecycle

The bgutil server stays running after the script starts it (reused across downloads). To stop it:
```powershell
Get-NetTCPConnection -LocalPort 4416 -State Listen | Select -Expand OwningProcess -Unique | ForEach { Stop-Process -Id $_ -Force }
```

## Permission prompts (Claude Code auto mode)

`git clone` (setup) and `--remote-components ejs:github` (runtime) are remote-code actions that get auto-blocked. The user must authorize them (one-time prompt, a Bash permission rule, or running the command themselves).
