#!/usr/bin/env python3
"""Append (or replace) an AI-generated summary section in an archive .txt file.

Usage:
    append_summary.py <txt_path> <summary_file>

Reads the summary text (UTF-8) from <summary_file> and appends it to <txt_path> beneath
a stable marker line. If the marker already exists, the previous summary section is
replaced rather than duplicated (idempotent). Output is UTF-8, no BOM, single CRLF.

The summary itself is written by Claude from the video's .srt transcript; this script
only handles the mechanical, formatting-safe append.
"""
import sys
from pathlib import Path

MARKER = "==================== SUMMARY ===================="


def main() -> int:
    if len(sys.argv) != 3:
        sys.exit("Usage: append_summary.py <txt_path> <summary_file>")

    txt_path = Path(sys.argv[1])
    summary = Path(sys.argv[2]).read_bytes().decode("utf-8")
    summary = summary.replace("\r\n", "\n").replace("\r", "\n").strip("\n")
    if not summary:
        sys.exit("Summary file is empty; nothing to append.")

    body = txt_path.read_bytes().decode("utf-8")
    body = body.replace("\r\n", "\n").replace("\r", "\n")

    # Drop any existing summary section so re-runs replace instead of stacking.
    idx = body.find(MARKER)
    if idx != -1:
        body = body[:idx]
    body = body.rstrip("\n")

    content = f"{body}\n\n{MARKER}\n\n{summary}\n"
    txt_path.write_bytes(content.replace("\n", "\r\n").encode("utf-8"))
    print(f"appended summary to {txt_path.name} ({len(summary)} chars)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
