# vin-skills

Agent skills collection (Claude Code, Codex, and other agents that read `SKILL.md`).

## Skills

| Skill | Description |
|-------|-------------|
| [disk-analyzer](./disk-analyzer/) | Analyze C: drive disk space usage and compare with previous snapshots to track what's growing over time. |
| [qnap-smb-repair](./qnap-smb-repair/) | Diagnose and fix the recurring "Windows can't connect to the QNAP NAS / mapped drives won't reconnect" problem on VincentNAS (TVS-951N, 192.168.0.60). |
| [vin-code-review](./vin-code-review/) | Generic Gemini Code Assist review workflow. |
| [vin-github-issue-search](./vin-github-issue-search/) | Search GitHub issues in any repository using gh CLI. |
| [vin-github-repo-find](./vin-github-repo-find/) | Search GitHub for repositories matching a description or keyword using gh CLI. |
| [vin-github-star-file](./vin-github-star-file/) | File newly-starred GitHub repos into the user's 32 curated star lists (github.com/itisvincent). |
| [vin-github-star-search](./vin-github-star-search/) | Search through GitHub starred repositories using gh CLI. |
| [vin-pdf-html](./vin-pdf-html/) | Edit a PDF document (e.g. a resume) through an HTML editor and re-export it. |
| [youtube-archive](./youtube-archive/) | Archive a pasted YouTube URL to its channel folder under Y:\Programming\youtube — writes a "NN <title>.txt" (URL + video description/chapters), downloads the video as "NN <title>.mp4", and one subtitle as "NN <title>.srt" (English first, else Chinese). |
| [youtube-download](./youtube-download/) | Download YouTube videos/audio to local files with yt-dlp, including members-only and PO-token-gated videos. |

## Installation

```bash
npx skills add ByteObject/vin-skills            # pick from the list
npx skills add ByteObject/vin-skills --skill <name>
```
