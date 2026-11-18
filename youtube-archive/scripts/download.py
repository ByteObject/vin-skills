#!/usr/bin/env python3
"""Archive one YouTube video to a channel folder.

Produces three files sharing a clean base name "NN <title>" (leading emoji stripped,
no [videoID] suffix), where NN is the next sequence number in the folder:

    NN <title>.txt   canonical URL + blank line + full video description
    NN <title>.mp4   best video+audio, merged to mp4
    NN <title>.srt   one subtitle -- English first (manual > auto); else Chinese only

Usage:
    download.py <youtube-url> <store-location> [number]

Called by download.bat (which launches it via `uv run`, since no real python is on PATH).
Uses only the standard library; yt-dlp is invoked as a subprocess.
"""
import argparse
import json
import re
import shutil
import subprocess
import sys
import unicodedata
from pathlib import Path

# Unicode categories to strip from the START of a title (emoji, symbols, marks, format, spaces).
_STRIP_CATS = {"So", "Sk", "Sm", "Sc", "Cs", "Cf", "Mn", "Zs"}
_ILLEGAL = re.compile(r'[\\/:*?"<>|]')
_CTRL = re.compile(r"[\x00-\x1f]")
_WS = re.compile(r"\s+")


def resolve_ytdlp() -> str:
    candidates = [Path.home() / ".local" / "bin" / "yt-dlp.exe"]
    try:
        r = subprocess.run(["uv", "tool", "dir", "--bin"], capture_output=True, text=True)
        if r.returncode == 0 and r.stdout.strip():
            candidates.append(Path(r.stdout.strip()) / "yt-dlp.exe")
    except Exception:
        pass
    which = shutil.which("yt-dlp")
    if which:
        candidates.append(Path(which))
    for c in candidates:
        if c and Path(c).exists():
            return str(c)
    sys.exit("yt-dlp not found. Install with: uv tool install yt-dlp")


def strip_leading_emoji(s: str) -> str:
    i, n = 0, len(s)
    while i < n and (s[i].isspace() or unicodedata.category(s[i]) in _STRIP_CATS):
        i += 1
    return s[i:]


def safe_name(title: str) -> str:
    s = strip_leading_emoji(title)
    s = _ILLEGAL.sub("", s)      # illegal Windows filename chars
    s = _CTRL.sub("", s)         # control chars
    s = s.replace("%", "％")  # avoid clashing with yt-dlp -o template
    s = _WS.sub(" ", s).strip().rstrip(". ")
    return s


def folder_uses_numbering(store: Path) -> bool:
    """True only if the folder holds a real numbered SEQUENCE — at least 2 distinct 'NN <title>'
    values. A lone '01 ...' (a one-off / left over from an old download) does NOT count, so
    one-off and project folders stay prefix-free."""
    nums = set()
    if store.is_dir():
        for f in store.iterdir():
            if f.is_file():
                m = re.match(r"(\d+)\s", f.name)
                if m:
                    nums.add(int(m.group(1)))
                    if len(nums) >= 2:
                        return True
    return False


def next_number(store: Path) -> str:
    mx = 0
    if store.is_dir():
        for f in store.iterdir():
            if f.is_file():
                m = re.match(r"(\d+)\s", f.name)
                if m:
                    mx = max(mx, int(m.group(1)))
    return f"{mx + 1:02d}"


def select_sub_lang(info: dict):
    """English first (manual > auto), else Chinese (manual > auto). Returns (lang, kind) or (None, None)."""
    manual = list((info.get("subtitles") or {}).keys())
    auto = list((info.get("automatic_captions") or {}).keys())

    def pick(langs, patterns):
        for p in patterns:
            for lang in langs:
                if lang == p or lang.startswith(p + "-"):
                    return lang
        return None

    en = ["en"]
    zh = ["zh-Hans", "zh-Hant", "zh-CN", "zh-TW", "zh"]
    for patterns in (en, zh):
        sel = pick(manual, patterns)
        if sel:
            return sel, "manual"
        sel = pick(auto, patterns)
        if sel:
            return sel, "auto"
    return None, None


def fmt_size(p: Path) -> str:
    return f"{p.stat().st_size / (1024 * 1024):.1f} MB" if p.exists() else "MISSING"


def main() -> int:
    ap = argparse.ArgumentParser(description="Archive one YouTube video (mp4 + srt + txt).")
    ap.add_argument("url")
    ap.add_argument("store")
    ap.add_argument("number", nargs="?", type=int, default=0)
    args = ap.parse_args()

    ytdlp = resolve_ytdlp()
    store = Path(args.store)
    store.mkdir(parents=True, exist_ok=True)

    print("==> Fetching metadata...", flush=True)
    r = subprocess.run(
        [ytdlp, "--no-plugin-dirs", "--no-warnings", "--no-playlist", "-J", args.url],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    if r.returncode != 0 or not r.stdout.strip():
        sys.stderr.write((r.stderr or "")[-2000:])
        sys.exit("Could not fetch video info. If members-only/gated, use the youtube-download skill (cookies + PO-token).")
    info = json.loads(r.stdout)

    vid = info["id"]
    title = info.get("title") or vid
    desc = info.get("description") or ""
    canon = f"https://www.youtube.com/watch?v={vid}"

    safe = safe_name(title)
    # Numbering policy: an explicit --number always wins. Otherwise, only add an "NN " prefix if the
    # folder ALREADY uses that convention (has at least one numbered file); a folder with no numbered
    # files stays prefix-free (clean title).
    if args.number > 0:
        prefix = f"{args.number:02d} "
    elif folder_uses_numbering(store):
        prefix = f"{next_number(store)} "
    else:
        prefix = ""

    # Keep the full path within ~250 chars, and the filename itself under 240 UTF-8
    # bytes. QNAP/SMB rejects a path component over 255 bytes; CJK titles hit that
    # long before the character cap (Windows then returns EINVAL).
    reserve = len(str(store)) + len(prefix) + 6  # prefix + " .mp4"
    max_title = max(20, 250 - reserve)
    if len(safe) > max_title:
        safe = safe[:max_title].rstrip(". ")
    while len((prefix + safe + ".mp4").encode("utf-8")) > 240 and len(safe) > 20:
        safe = safe[:-1].rstrip(". ")

    base = f"{prefix}{safe}"
    print(f"==> Base name: {base}", flush=True)

    # 1) txt = URL + blank line + description. Normalize every line ending to \n, then emit a
    #    single CRLF via write_bytes (write_text would re-translate \n and yield \r\r\n).
    desc_norm = desc.replace("\r\n", "\n").replace("\r", "\n")
    content = f"{canon}\n\n{desc_norm}".replace("\n", "\r\n")
    txt_path = store / f"{base}.txt"
    txt_path.write_bytes(content.encode("utf-8"))
    print(f"    wrote {txt_path}", flush=True)

    # 2) choose subtitle language
    lang, kind = select_sub_lang(info)
    if lang:
        print(f"==> Subtitle: {lang} ({kind})", flush=True)
    else:
        print("==> No English/Chinese subtitles available.", flush=True)

    # 3) download video (+ subtitle)
    out_tmpl = str(store / f"{base}.%(ext)s")
    dl = [ytdlp, "--no-plugin-dirs", "--no-warnings", "--no-playlist", "-f", "bv*+ba/b",
          "--merge-output-format", "mp4", "-o", out_tmpl]
    if lang:
        dl += ["--write-subs", "--write-auto-subs", "--sub-langs", lang, "--convert-subs", "srt"]
    dl += [args.url]

    print("==> Downloading video...", flush=True)
    rc = subprocess.run(dl).returncode
    if rc != 0:
        sys.exit(f"yt-dlp exited with code {rc}. If members-only/gated, use the youtube-download skill.")

    # 4) normalize subtitle filename to the shared base (<base>.srt)
    srt_final = store / f"{base}.srt"
    for f in store.iterdir():
        if f.is_file() and f.name.startswith(base) and f.suffix.lower() == ".srt" and f != srt_final:
            if srt_final.exists():
                srt_final.unlink()
            f.rename(srt_final)
            break

    mp4_path = store / f"{base}.mp4"
    print()
    print(f"==> Done ({base})")
    print(f"    txt : {txt_path}")
    print(f"    mp4 : {mp4_path}  [{fmt_size(mp4_path)}]")
    print(f"    srt : {srt_final}  [{fmt_size(srt_final)}]" if srt_final.exists() else "    srt : (none)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
