#!/usr/bin/env python3
"""Transcribe a local audio/video file to a .srt using faster-whisper.

Fallback path for videos that have NO YouTube captions: transcribe the local mp4.
Tries the GPU (CUDA) first, falls back to CPU automatically.

Usage:
    transcribe.py <input-media> <output-srt> [--model large-v3] [--lang zh]

Run via uv with the CUDA runtime libs so the GPU is usable, e.g.:
    uv run --with faster-whisper --with nvidia-cublas-cu12 --with nvidia-cudnn-cu12 \
        transcribe.py "in.mp4" "out.srt" --model large-v3 --lang zh
"""
import argparse
import glob
import os
import subprocess
import sys
import tempfile
from pathlib import Path


def add_nvidia_dll_dirs() -> None:
    """Make CUDA/cuDNN DLLs shipped by the nvidia-* pip packages discoverable on Windows.

    ctranslate2 loads cublas/cudnn via plain LoadLibrary and those in turn depend on
    cudart, so os.add_dll_directory is not enough — the dirs must also be on PATH.
    """
    try:
        import nvidia  # namespace package created by nvidia-*-cu12 wheels
    except Exception:
        return
    dirs = []
    for base in list(getattr(nvidia, "__path__", [])):
        for bindir in glob.glob(os.path.join(base, "*", "bin")):
            if os.path.isdir(bindir):
                dirs.append(bindir)
    for d in dirs:
        try:
            os.add_dll_directory(d)
        except Exception:
            pass
    if dirs:
        os.environ["PATH"] = os.pathsep.join(dirs) + os.pathsep + os.environ.get("PATH", "")


def extract_wav(src: str, wav: str) -> None:
    subprocess.run(
        ["ffmpeg", "-y", "-i", src, "-vn", "-ac", "1", "-ar", "16000", "-f", "wav", wav],
        check=True, capture_output=True,
    )


def load_wav(wav: str):
    """Read the 16k mono s16 WAV into a float32 array, so faster-whisper never calls PyAV
    (newer `av` releases dropped the `metadata_errors` kwarg faster-whisper still passes)."""
    import wave
    import numpy as np
    with wave.open(wav, "rb") as w:
        frames = w.readframes(w.getnframes())
    return np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0


def fmt_ts(t: float) -> str:
    if t < 0:
        t = 0.0
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = int(t % 60)
    ms = int(round((t - int(t)) * 1000))
    if ms == 1000:
        ms = 0
        s += 1
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("output")
    ap.add_argument("--model", default="large-v3")
    ap.add_argument("--lang", default="zh", help='language code, or "auto" to detect')
    args = ap.parse_args()

    add_nvidia_dll_dirs()
    from faster_whisper import WhisperModel

    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    tmp.close()
    try:
        print("==> extracting audio (16k mono wav)...", flush=True)
        extract_wav(args.input, tmp.name)

        model = None
        used_device = None
        for device, ctype in (("cuda", "int8_float16"), ("cpu", "int8")):
            try:
                print(f"==> loading {args.model} on {device} ({ctype})...", flush=True)
                model = WhisperModel(args.model, device=device, compute_type=ctype)
                used_device = device
                break
            except Exception as e:
                print(f"    {device} unavailable: {e}", flush=True)
        if model is None:
            sys.exit("Could not load Whisper model on GPU or CPU.")

        segments, info = model.transcribe(
            load_wav(tmp.name), language=None if args.lang == "auto" else args.lang,
            beam_size=5, vad_filter=True,
            # Stops the long-form failure mode where large-v3 locks into 1-second
            # fragments and repeated lines after ~10 minutes.
            condition_on_previous_text=False,
        )
        print(f"==> transcribing (device={used_device}, lang={info.language}, "
              f"duration={info.duration:.0f}s)...", flush=True)

        entries = []
        i = 0
        for seg in segments:
            i += 1
            text = seg.text.strip()
            entries.append(f"{i}\n{fmt_ts(seg.start)} --> {fmt_ts(seg.end)}\n{text}\n")
            if i % 20 == 0:
                print(f"    {i} segments ({seg.end:.0f}s)", flush=True)

        Path(args.output).write_bytes(("\n".join(entries) + "\n").encode("utf-8"))
        print(f"==> wrote {args.output} ({i} segments, {used_device})")
        return 0
    finally:
        try:
            os.unlink(tmp.name)
        except Exception:
            pass


if __name__ == "__main__":
    sys.exit(main())
