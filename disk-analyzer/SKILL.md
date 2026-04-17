# Disk Analyzer Skill

## Purpose
Analyze C: drive disk space usage and compare with previous snapshots to track what's growing over time.

## When to Use
- User asks "why is my C: drive full" or "disk space shrinking"
- User wants to see where disk space is going
- User wants to track disk usage changes over time

## Workflow

### Step 1: Run the diagnostic script
```bash
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\Users\Vincent\.claude\skills\disk-analyzer\diskscan.ps1"
```

### Step 2: Analyze the output

The script automatically:
1. Scans all major folders on C: drive
2. Breaks down Users, AppData\Local, AppData\Roaming, dev caches, and Windows components
3. Saves a timestamped JSON snapshot to `C:\Users\Vincent\.claude\skills\disk-analyzer\snapshots\`
4. If a previous snapshot exists, shows a **comparison** highlighting:
   - Overall drive used/free change
   - Per-folder deltas (only changes > 50 MB)
   - Top 5 growers and top 5 shrinkers

### Step 3: Present findings

**Always start with this ASCII snapshot block:**

```
╔══════════════════════════════════════════╗
║  C: Drive  255 GB total                  ║
║  ████████████████████░░░░░  75% used     ║
║  Used: 191 GB   Free: 63 GB              ║
╠══════════════════════════════════════════╣
║  Windows   ██████░░░░░░░░░░  48 GB       ║
║  Users     █████████████░░░  86 GB       ║
║  Programs  ██████░░░░░░░░░░  41 GB       ║
║  Other     ██░░░░░░░░░░░░░░  16 GB       ║
╚══════════════════════════════════════════╝
```
Fill in real values from the scan output. Bar length = proportional to 255 GB (each █ ≈ 8 GB).

Then continue with:
1. **Drive Summary** — Total / Used / Free
2. **Top Space Consumers** — Grouped by category
3. **Comparison** (if previous snapshot exists) — What grew, what shrank
4. **Recommendations** — Safe cleanup suggestions

## Snapshot History
- Snapshots are stored as JSON in: `C:\Users\Vincent\.claude\skills\disk-analyzer\snapshots\`
- Each run creates a new snapshot with timestamp
- Comparison always uses the most recent previous snapshot
- To compare with older snapshots, read the JSON files directly

## Important Rules
- **ANALYSIS ONLY** — Do NOT delete files or clean caches without user permission
- Always note that WinSxS is mostly hard links — actual unique space is much smaller
- Distinguish between reclaimable cache (npm, pnpm, Chrome) and system-required files
- Flag any folder that grew >1 GB since last snapshot as a potential issue
