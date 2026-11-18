---
name: youtube-download
description: Download YouTube videos/audio to local files with yt-dlp, including members-only and PO-token-gated videos. Use when the user wants to download, save, or archive a YouTube video or its audio, grab a members-only/paid video they have access to, or when a plain download returns only storyboards or errors like "members-only", "Join this channel", "The page needs to be reloaded", "Only images are available", "Requested format is not available", or "cookies are no longer valid". Windows/PowerShell environment using yt-dlp (via uv) + bgutil PO-token provider + yt-dlp EJS challenge solver.
---

# YouTube Download

Download YouTube content with `yt-dlp`. Plain videos are one command; members-only / PO-token-gated videos need a cookies + PO-token + JS-challenge pipeline. The orchestrator script handles the escalation automatically.

For how a regular download differs from a gated one and the step-by-step for each, read `references/regular-vs-members.md`.

Only download content the user has the right to access, for personal/offline use. Do not redistribute paid/members content.

## Tooling layout (this machine)

- `yt-dlp`: installed via `uv tool`, at `~\.local\bin\yt-dlp.exe` (NOT on PATH — resolve via `uv tool dir --bin`). bgutil plugin lives in its venv.
- `ffmpeg`/`ffprobe`: on PATH (needed for HLS + merging).
- `deno`: `~\.deno\bin\deno.exe` (runs the PO-token server and the EJS solver).
- bgutil PO-token provider: cloned at `~\bgutil-ytdlp-pot-provider` (deps installed via `deno install` in its `server/`).

If any are missing, run setup first:
```powershell
powershell -ExecutionPolicy Bypass -File <skill>\scripts\setup.ps1
```

## Quick start

Most downloads — just pass the URL (the script auto-escalates through plain → JS-challenge → gated):
```powershell
powershell -File <skill>\scripts\yt-download.ps1 -Url "https://www.youtube.com/watch?v=VIDEO_ID"
```

Members-only / gated video (needs cookies — see below):
```powershell
powershell -File <skill>\scripts\yt-download.ps1 -Url "URL" -Cookies "C:\path\cookies.txt" -Gated
```

Useful flags: `-Format "96/best"` (pick a format id / selector), `-OutDir "D:\Videos"`, `-Simulate` (extract only, no download), `-Quality 1080` (cap height).

## Members-only / gated videos — what's required

A gated video needs THREE things together; cookies alone yield only storyboards. The script wires all three:
1. **Cookies** — the user's logged-in YouTube session (membership account).
2. **PO-token server** (bgutil) — auto-started by the script on `http://[::1]:4416`.
3. **EJS challenge solver** — yt-dlp downloads + runs it in deno (`--remote-components ejs:github`).

### Getting cookies that work (critical)

Cookies must come from a session that won't be reused, or YouTube rotates them and they die mid-download ("cookies are no longer valid"). Tell the user to:
1. Open an **Incognito** window; ensure the cookie-export extension is allowed in incognito.
2. Sign in to YouTube with the membership account; open the target video to confirm access.
3. Export **youtube.com** cookies in **Netscape** format to a file.
4. **Immediately close the Incognito window** — do not browse further.
5. Provide the cookies.txt path right away.

Then run with `-Cookies <path> -Gated`. After success, **delete the cookies file** (live session = full account access).

## Permissions note

Each remote-code step gets auto-blocked under Claude Code's auto mode and needs the user's explicit OK:
- cloning bgutil (setup), and
- `--remote-components ejs:github` (fetches yt-dlp's solver at runtime).
If blocked, stop and ask the user to authorize, or have them add a Bash permission rule / run the command themselves.

## Format / quality

- Default selector `bv*+ba/b` grabs best video+audio, merged to mp4.
- Gated videos via the `web_safari` client expose **HLS (m3u8)** variants, usually up to 1080p, often muxed (no separate merge). For 1080p specifically, `-f 96` works in the verified case; otherwise `-Quality 1080`.
- For >1080p (1440p/4K) on public videos, the `default`/`web` clients expose DASH; try without `-PlayerClient web_safari`.

## Verify

After download, confirm with ffprobe (resolution/duration) and report the file path + size. The script prints the final path.

## Troubleshooting

For the full error→cause→fix table, IPv6 server quirk, deno script-vs-server timeout, and cookie details, read `references/troubleshooting.md`.
