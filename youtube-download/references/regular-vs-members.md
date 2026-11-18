# Regular vs members-only downloads

Quick map of how a normal public download differs from a members-only / PO-token-gated one, and the exact steps for each.

## TL;DR

| Aspect | Regular (public) video | Members-only / gated video |
|---|---|---|
| Auth cookies | Not needed | **Required** (logged-in membership account) |
| PO token (bgutil server) | Usually not needed | **Required** (else only storyboards) |
| EJS n-challenge solver | Often needed for current players | **Required** |
| ffmpeg | For merge/HLS | For merge/HLS |
| Command | `yt-dlp <URL>` | `yt-dlp` + cookies + `--remote-components ejs:github` + bgutil extractor-args |
| Typical failure if a piece is missing | n/a | "members-only", "only storyboards", "page needs to be reloaded", "cookies no longer valid" |

The skill's `scripts/yt-download.ps1` auto-escalates between these, so you normally just pass the URL (and cookies for gated).

## Why the difference

YouTube gates content in layers. A download must clear each layer that applies:

1. **Access (membership)** — members content checks your account. Cleared by cookies.
2. **Bot / origin check (PO token)** — YouTube withholds real stream URLs (leaving only image storyboards) until a valid GVS "Proof-of-Origin" token is presented. bgutil mints it.
3. **Signature challenge (n-sig)** — stream URLs carry an obfuscated `n` parameter that must be transformed by running YouTube's player JS. yt-dlp's EJS solver does this in deno.

Public videos pass layer 1 automatically and often only need layer 3. Members content needs all three at once — cookies alone yield only storyboards.

## Regular (public) video — steps

1. Run: `yt-download.ps1 -Url "<URL>"` (or `yt-dlp "<URL>"`).
2. What happens internally:
   - download webpage + player API JSON
   - if the player needs it: download + run the EJS solver in deno (n-challenge)
   - pick best format (`bv*+ba/b`)
   - download stream(s); ffmpeg merges to mp4
3. Done — file lands in the output dir.

If it returns only storyboards or "page needs to be reloaded", the script adds `--remote-components ejs:github` and retries; if it then says "members-only", it's actually gated → see below.

## Members-only / gated video — steps

0. Confirm the user is a paying member of that channel.
1. **Export cookies** from a session that won't be reused (so they don't rotate):
   - Incognito window → sign in to YouTube (membership account) → open the video to confirm access
   - export youtube.com cookies (Netscape format) to a file
   - **close the incognito window immediately**
2. **Start the bgutil PO-token server** (the script does this automatically; binds `[::]:4416`, reached via `http://[::1]:4416`).
3. **Run** with all three pieces:
   `yt-download.ps1 -Url "<URL>" -Cookies "<cookies.txt>" -Gated`
   which invokes yt-dlp with: `--cookies <file> --remote-components ejs:github --extractor-args "youtube:player_client=web_safari;youtubepot-bgutilhttp:base_url=http://[::1]:4416"`.
4. What happens internally:
   - cookies authenticate the membership → passes the members gate
   - bgutil server returns a PO token → real formats appear (HLS, usually ≤1080p)
   - EJS solver deciphers the `n` signature → stream URLs become downloadable
   - download; ffmpeg fixes/merges to mp4
5. **Delete the cookies file** afterward (live session = full Google account access).

## Symptom → missing piece

| You see | Missing piece |
|---|---|
| `Join this channel` / `members-only` | cookies (or they're invalid) |
| `cookies are no longer valid` | cookies rotated — re-export from a closed incognito session |
| Only `sb0..sb3` storyboards / `Only images are available` | PO token (bgutil server) |
| `The page needs to be reloaded` / `n challenge ... failed` | EJS solver (`--remote-components ejs:github`) and/or PO token |

For the full error table and details, see `troubleshooting.md`.
