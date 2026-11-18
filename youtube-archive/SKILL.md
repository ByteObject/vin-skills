---
name: youtube-archive
description: Archive a pasted YouTube URL to its channel folder under Y:\Programming\youtube — writes a "NN <title>.txt" (URL + video description/chapters), downloads the video as "NN <title>.mp4", and one subtitle as "NN <title>.srt" (English first, else Chinese). Use whenever the user pastes a YouTube URL and wants it saved/archived/downloaded into the youtube library, or invokes /youtube-archive. Wraps scripts\download.bat (url, store-location).
---

# YouTube Archive

Standard operating procedure for archiving a YouTube video into the library at
`Y:\Programming\youtube`. One video → three files sharing a clean base name (`<title>`, or
`NN <title>` only in folders that already use a numbered sequence):

| File | Contents |
|------|----------|
| `<title>.txt` | canonical URL, blank line, the full video description (`视频简介` + `YouTube时间戳` chapters), and — when a subtitle was downloaded — an appended **English summary with clickable timestamps** |
| `<title>.mp4` | best video+audio, merged to mp4 |
| `<title>.srt` | one subtitle — **English first** (manual, else auto); if no English, **Chinese only** |

**Numbering is automatic and folder-aware** (handled by `download.py`, no manual stripping needed):
the base name is just the clean `<title>` **unless the target folder already contains a numbered
*sequence* (≥2 files like `01 …`, `02 …`)**, in which case the next number is prefixed (`NN <title>`).
A folder with no numbered files — or only a single leftover `01 …` — stays prefix-free. The title
strips any leading emoji and carries no `[videoID]` suffix.

Only archive content the user has the right to access, for personal/offline use.

## When the user pastes a URL — do this

1. **Read the uploader** (to pick the folder). One quick call — resolve yt-dlp via
   `~\.local\bin\yt-dlp.exe` (it is NOT on PATH):
   ```powershell
   & "$env:USERPROFILE\.local\bin\yt-dlp.exe" --no-plugin-dirs --no-warnings --skip-download `
     --print "%(uploader)s|%(channel)s|%(title)s" "<URL>"
   ```

2. **Pick the store folder.** The library is organized by channel under category roots. List the
   existing channel folders and match the uploader to one:
   ```
   Y:\Programming\youtube\{AI, Course, Development, Trading}\<channel-folder>
   ```
   Folder names are brand aliases, not literal channel names (e.g. uploader `AI超元域` →
   `AI\AIsuperdomain`). Use Glob/list to find the best existing match. **If the match is
   confident, download there immediately — do not ask.** Only ask when nothing matches or
   confidence is low (ambiguous alias, new channel, or multiple plausible folders). Then propose a
   category and a new folder name.

3. **Run the downloader** with the chosen folder. From the PowerShell tool, call the Python
   worker directly via `uv run` (robust argument passing):
   ```powershell
   uv run --no-project "C:\Users\Vincent\.claude\skills\youtube-archive\scripts\download.py" "<URL>" "<STORE_FOLDER>"
   ```
   Always quote both arguments. The worker derives the clean base name (adding an `NN ` prefix only
   if the folder already uses a numbered sequence — see Numbering below), writes the txt, downloads
   the mp4, downloads+converts the chosen subtitle to `.srt`, and prints the final paths. To force a
   specific number, pass it as a third argument.

   > The user can also run `scripts\download.bat "<URL>" "<STORE_FOLDER>" [number]` from **cmd.exe**
   > or by double-clicking — same result. Do **not** invoke that `.bat` via PowerShell's `&`, which
   > mis-splits the URL; use the `uv run` form above (or `cmd /c`).

4. **Append an English summary (only if a `.srt` was produced).** If the script reported a real
   `.srt` (not "(none)"), summarize the video from its transcript and append it to the `.txt`.
   - Read the `.srt` — it is the **timestamped** transcript (each cue has a start time).
   - Write the summary in **English** (always English, even for Chinese videos), strictly from the
     transcript, in this style:
     - A 1–2 sentence intro of what the video is.
     - `###` section headings that group the content, each with `*` bullets; **bold** the key term
       leading each bullet.
     - End bullets with one or more **clickable timestamp deep-links** of the exact form
       `[[mm:ss](https://www.youtube.com/watch?v=<ID>&t=<seconds>)]`, where `<seconds>` is the cue's
       start in whole seconds and `mm:ss` is the display time (use `h:mm:ss` for videos ≥ 1 hour).
       Example: `[[08:23](https://www.youtube.com/watch?v=V1f8MOQiHRw&t=503)]`.
   - Save the summary to a temp file (UTF-8, e.g. `$env:TEMP\yt_summary.txt`), then append it under
     the `==================== SUMMARY ====================` marker (idempotent — replaces on re-run):
     ```powershell
     uv run --no-project "C:\Users\Vincent\.claude\skills\youtube-archive\scripts\append_summary.py" "<TXT_PATH>" "$env:TEMP\yt_summary.txt"
     ```
   - **If the script reported `srt : (none)`**, do **not** just skip — a `.srt` can still be
     produced locally from the downloaded `.mp4` via Whisper (see **Step 4b**). Run that fallback,
     then return here to write the summary. Only leave the `.txt` description-only if the user
     declines transcription or the `.mp4` itself failed.

4b. **No YouTube captions → transcribe locally with Whisper (fallback for Step 4).** If
   `download.py` reported `srt : (none)` but the `.mp4` was downloaded, produce a `.srt` yourself
   with `transcribe.py` (faster-whisper on the GPU), then go back to **Step 4** to write the
   English summary from it.
   - The recipe (PowerShell). The three `nvidia-*-cu12` wheels are **required** on Windows —
     without `nvidia-cuda-runtime-cu12` you get `RuntimeError: Library cublas64_12.dll is not found`:
     ```powershell
     uv run --no-project `
       --with faster-whisper `
       --with nvidia-cublas-cu12 --with nvidia-cudnn-cu12 --with nvidia-cuda-runtime-cu12 `
       "C:\Users\Vincent\.claude\skills\youtube-archive\scripts\transcribe.py" `
       "<MP4_PATH>" "<SRT_PATH>" --model large-v3 --lang zh
     ```
   - `transcribe.py` extracts a 16k mono WAV via ffmpeg, tries `cuda`/`int8_float16` first and
     falls back to `cpu`/`int8`, and writes the `.srt` at the path you give it. It also calls
     `add_nvidia_dll_dirs()` to put the nvidia-pip-package `*/bin` dirs on `PATH` — that's the bit
     a hand-written inline snippet misses, so **use this script rather than rolling your own**.
   - `--lang zh` for Chinese videos, `--lang en` for English. The `large-v3` model is cached at
     `~\.cache\huggingface\hub\models--Systran--faster-whisper-large-v3`, so no model download
     after the first run.
   - **Footgun:** a failed run can leave an **empty `.srt`** (the output file is opened before the
     segment generator is iterated). Delete any 0-byte `.srt` before re-running, or `transcribe.py`
     will skip it as "already exists".

5. **Report** the created file paths, the mp4/srt sizes (the script prints them), and whether a
   summary was appended.

## Notes

- **Numbering** is folder-aware and automatic: `download.py` adds an `NN ` prefix **only** when the
  target folder already has a numbered *sequence* (≥2 files like `01 …`, `02 …`); it then uses the
  next number. Folders with no numbered files — or just one stray `01 …` — get a clean prefix-free
  title. Pass an explicit third arg (`… "<folder>" 41`) to force a specific number. So point at the
  folder that holds the series and numbering continues; point at a one-off/project folder and it
  stays unnumbered — no manual prefix-stripping.
- **Subtitles:** the script downloads exactly one track — English if any English (manual or
  auto-generated/translated) exists, otherwise the best Chinese track, converted to `.srt` and
  renamed to the shared base. If neither exists, no `.srt` is produced (the script says so) — in
  that case fall back to **Step 4b** (local Whisper transcription) before writing the summary.
- **Filenames:** leading emoji are stripped and Windows-illegal characters removed; CJK and
  full-width punctuation are preserved. Very long titles are trimmed to keep the path under ~250.

## Members-only / gated videos

`download.bat` does a straightforward public download. If it reports the video is
members-only/gated (metadata fetch fails, or only storyboards/`Only images are available`), stop
and fall back to the **youtube-download** skill (`~\.claude\skills\youtube-download`), which wires
cookies + PO-token + JS-challenge. Get the mp4 there, then the txt/srt can be produced separately.

## Files

- `scripts\download.bat` — cmd.exe / double-click entry point: `download.bat "<url>" "<store>" [number]`
  (thin launcher; runs the Python worker via `uv run`).
- `scripts\download.py` — the worker (metadata, txt, numbering, video, subtitle). Claude runs this
  directly via `uv run` (stdlib only; invokes `yt-dlp.exe` as a subprocess).
- `scripts\append_summary.py` — appends/replaces the English summary section in a `.txt` with
  formatting-safe CRLF. Claude writes the summary; this script only does the mechanical append.
- `scripts\transcribe.py` — Whisper fallback for videos with **no YouTube captions**: transcribes
  the local `.mp4` to a `.srt` via `faster-whisper` (GPU-first, CPU fallback). Run via `uv run`
  with `--with faster-whisper --with nvidia-cublas-cu12 --with nvidia-cudnn-cu12 --with
  nvidia-cuda-runtime-cu12` (the cuda-runtime wheel is mandatory on Windows — see Step 4b).
  CLI: `transcribe.py <mp4> <srt> --model large-v3 --lang zh`.
