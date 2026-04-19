param(
    [string]$SnapshotDir = "$PSScriptRoot\snapshots"
)

$ErrorActionPreference = "SilentlyContinue"

# Ensure snapshot directory exists
if (-not (Test-Path $SnapshotDir)) {
    New-Item -ItemType Directory -Path $SnapshotDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$snapshotFile = Join-Path $SnapshotDir "$timestamp.json"

function Get-DirSize($path) {
    $size = (Get-ChildItem $path -Recurse -Force -ErrorAction SilentlyContinue |
        Where-Object { -not $_.PSIsContainer } |
        Measure-Object Length -Sum).Sum
    if ($null -eq $size) { return 0 }
    return [math]::Round($size / 1MB)
}

function Format-Size($mb) {
    if ($mb -ge 1024) {
        return "{0:N1} GB" -f ($mb / 1024)
    }
    return "{0:N0} MB" -f $mb
}

function Format-Delta($deltaMB) {
    if ($deltaMB -eq 0) { return "" }
    $sign = if ($deltaMB -gt 0) { "+" } else { "" }
    if ([math]::Abs($deltaMB) -ge 1024) {
        return "  ({0}{1:N1} GB)" -f $sign, ($deltaMB / 1024)
    }
    return "  ({0}{1:N0} MB)" -f $sign, $deltaMB
}

# Uniformly read keys/values whether $folders is a Hashtable (fresh snapshot,
# built in memory) or a PSCustomObject (previous snapshot, deserialized from JSON).
function Get-FolderKeys($folders) {
    if ($null -eq $folders) { return @() }
    if ($folders -is [hashtable]) { return @($folders.Keys) }
    return @($folders.PSObject.Properties.Name)
}

function Get-FolderValue($folders, $key) {
    if ($null -eq $folders) { return 0 }
    if ($folders -is [hashtable]) {
        if ($folders.ContainsKey($key)) { return [int]$folders[$key] }
        return 0
    }
    $prop = $folders.PSObject.Properties[$key]
    if ($prop) { return [int]$prop.Value }
    return 0
}

# ── Drive summary ──
Write-Host "============================================"
Write-Host "  Disk Space Analysis Report"
Write-Host "  $((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))"
Write-Host "============================================"
Write-Host ""

$disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
$totalGB = [math]::Round($disk.Size / 1GB, 1)
$freeGB = [math]::Round($disk.FreeSpace / 1GB, 1)
$usedGB = [math]::Round(($disk.Size - $disk.FreeSpace) / 1GB, 1)
$usedPct = [math]::Round(($disk.Size - $disk.FreeSpace) / $disk.Size * 100, 1)

Write-Host "=== C: Drive Summary ==="
Write-Host "Total:  $totalGB GB"
Write-Host "Used:   $usedGB GB ($usedPct%)"
Write-Host "Free:   $freeGB GB"
Write-Host ""

# ── Build snapshot data ──
$snapshot = @{
    timestamp = (Get-Date).ToString("o")
    drive = @{
        totalMB = [math]::Round($disk.Size / 1MB)
        usedMB = [math]::Round(($disk.Size - $disk.FreeSpace) / 1MB)
        freeMB = [math]::Round($disk.FreeSpace / 1MB)
    }
    folders = @{}
}

# ── Scan top-level C: folders ──
Write-Host "=== Top-Level C: Folders ==="
$topFolders = Get-ChildItem C:\ -Directory -Force -ErrorAction SilentlyContinue
foreach ($dir in $topFolders) {
    $sizeMB = Get-DirSize $dir.FullName
    if ($sizeMB -gt 500) {
        $snapshot.folders[$dir.FullName] = $sizeMB
        Write-Host ("{0,10}  {1}" -f (Format-Size $sizeMB), $dir.FullName)
    }
}

# Pagefile
$pf = Get-CimInstance Win32_PageFileUsage -ErrorAction SilentlyContinue
if ($pf) {
    $pfMB = $pf.AllocatedBaseSize
    $snapshot.folders["C:\pagefile.sys"] = $pfMB
    Write-Host ("{0,10}  {1}" -f (Format-Size $pfMB), "C:\pagefile.sys")
}
Write-Host ""

# ── User profile breakdown ──
Write-Host "=== C:\Users\Vincent Breakdown ==="
$userDirs = Get-ChildItem "C:\Users\Vincent" -Directory -Force -ErrorAction SilentlyContinue
foreach ($dir in $userDirs) {
    $sizeMB = Get-DirSize $dir.FullName
    if ($sizeMB -gt 500) {
        $key = "Users\Vincent\" + $dir.Name
        $snapshot.folders[$key] = $sizeMB
        Write-Host ("{0,10}  {1}" -f (Format-Size $sizeMB), $dir.Name)
    }
}
Write-Host ""

# ── AppData\Local breakdown ──
Write-Host "=== AppData\Local (>500 MB) ==="
$localDirs = Get-ChildItem "C:\Users\Vincent\AppData\Local" -Directory -Force -ErrorAction SilentlyContinue
foreach ($dir in $localDirs) {
    $sizeMB = Get-DirSize $dir.FullName
    if ($sizeMB -gt 500) {
        $key = "AppData\Local\" + $dir.Name
        $snapshot.folders[$key] = $sizeMB
        Write-Host ("{0,10}  {1}" -f (Format-Size $sizeMB), $dir.Name)
    }
}
Write-Host ""

# ── AppData\Roaming breakdown ──
Write-Host "=== AppData\Roaming (>500 MB) ==="
$roamingDirs = Get-ChildItem "C:\Users\Vincent\AppData\Roaming" -Directory -Force -ErrorAction SilentlyContinue
foreach ($dir in $roamingDirs) {
    $sizeMB = Get-DirSize $dir.FullName
    if ($sizeMB -gt 500) {
        $key = "AppData\Roaming\" + $dir.Name
        $snapshot.folders[$key] = $sizeMB
        Write-Host ("{0,10}  {1}" -f (Format-Size $sizeMB), $dir.Name)
    }
}
Write-Host ""

# ── Dev caches ──
Write-Host "=== Dev Tool Caches ==="
$devCaches = @{
    "npm-cache"       = "C:\Users\Vincent\AppData\Local\npm-cache"
    "pnpm-store"      = "C:\Users\Vincent\AppData\Local\pnpm"
    ".npm (global)"   = "C:\Users\Vincent\.npm"
    ".bun"            = "C:\Users\Vincent\.bun"
    ".cache"          = "C:\Users\Vincent\.cache"
    ".android"        = "C:\Users\Vincent\.android"
    ".claude"         = "C:\Users\Vincent\.claude"
    "node_modules (home)" = "C:\Users\Vincent\node_modules"
}
foreach ($entry in $devCaches.GetEnumerator() | Sort-Object Key) {
    if (Test-Path $entry.Value) {
        $sizeMB = Get-DirSize $entry.Value
        $key = "dev-cache\" + $entry.Key
        $snapshot.folders[$key] = $sizeMB
        Write-Host ("{0,10}  {1}" -f (Format-Size $sizeMB), $entry.Key)
    }
}
Write-Host ""

# ── Windows special ──
Write-Host "=== Windows Components ==="
$winFolders = @{
    "WinSxS"               = "C:\Windows\WinSxS"
    "Installer"            = "C:\Windows\Installer"
    "SoftwareDistribution" = "C:\Windows\SoftwareDistribution"
    "Temp"                 = "C:\Windows\Temp"
}
foreach ($entry in $winFolders.GetEnumerator() | Sort-Object Key) {
    $sizeMB = Get-DirSize $entry.Value
    $key = "Windows\" + $entry.Key
    $snapshot.folders[$key] = $sizeMB
    Write-Host ("{0,10}  {1}" -f (Format-Size $sizeMB), $entry.Key)
}

# User temp
$userTempMB = Get-DirSize $env:TEMP
$snapshot.folders["UserTemp"] = $userTempMB
Write-Host ("{0,10}  {1}" -f (Format-Size $userTempMB), "User Temp")
Write-Host ""

# ── Save snapshot ──
$snapshot | ConvertTo-Json -Depth 5 | Set-Content -Path $snapshotFile -Encoding UTF8
Write-Host "Snapshot saved: $snapshotFile"
Write-Host ""

# ── Compare with previous snapshot ──
$allSnapshots = Get-ChildItem $SnapshotDir -Filter "*.json" | Sort-Object Name
if ($allSnapshots.Count -ge 2) {
    $prevFile = $allSnapshots[-2]
    $prev = Get-Content $prevFile.FullName -Raw | ConvertFrom-Json
    $prevDate = if ($prev.timestamp) { [datetime]::Parse($prev.timestamp).ToString("yyyy-MM-dd HH:mm") } else { $prevFile.BaseName }

    Write-Host "============================================"
    Write-Host "  Comparison with: $prevDate"
    Write-Host "============================================"
    Write-Host ""

    # Drive-level delta
    $driveDelta = $snapshot.drive.usedMB - $prev.drive.usedMB
    $freeDelta = $snapshot.drive.freeMB - $prev.drive.freeMB
    Write-Host ("Used:  {0} GB  -> {1} GB  {2}" -f
        [math]::Round($prev.drive.usedMB / 1024, 1),
        [math]::Round($snapshot.drive.usedMB / 1024, 1),
        (Format-Delta $driveDelta))
    Write-Host ("Free:  {0} GB  -> {1} GB  {2}" -f
        [math]::Round($prev.drive.freeMB / 1024, 1),
        [math]::Round($snapshot.drive.freeMB / 1024, 1),
        (Format-Delta $freeDelta))
    Write-Host ""

    # Folder deltas — only show changes > 50 MB
    Write-Host "=== Folder Changes (>50 MB delta) ==="
    $allKeys = @()
    $allKeys += Get-FolderKeys $snapshot.folders
    $allKeys += Get-FolderKeys $prev.folders
    $allKeys = $allKeys | Sort-Object -Unique

    $changes = @()
    foreach ($key in $allKeys) {
        $nowMB  = Get-FolderValue $snapshot.folders $key
        $prevMB = Get-FolderValue $prev.folders     $key
        $delta = $nowMB - $prevMB
        if ([math]::Abs($delta) -gt 50) {
            $changes += [PSCustomObject]@{
                Folder  = $key
                Before  = Format-Size $prevMB
                After   = Format-Size $nowMB
                Delta   = Format-Delta $delta
                DeltaMB = $delta
            }
        }
    }

    if ($changes.Count -eq 0) {
        Write-Host "No significant changes (>50 MB) detected."
    } else {
        $changes | Sort-Object DeltaMB -Descending | ForEach-Object {
            Write-Host ("{0,-40} {1,10} -> {2,10} {3}" -f $_.Folder, $_.Before, $_.After, $_.Delta)
        }
    }

    # Top growers
    Write-Host ""
    Write-Host "=== Top 5 Growers ==="
    $changes | Sort-Object DeltaMB -Descending | Select-Object -First 5 | ForEach-Object {
        Write-Host ("{0,-40} {1}" -f $_.Folder, $_.Delta)
    }

    Write-Host ""
    Write-Host "=== Top 5 Shrinkers ==="
    $changes | Sort-Object DeltaMB | Select-Object -First 5 | ForEach-Object {
        Write-Host ("{0,-40} {1}" -f $_.Folder, $_.Delta)
    }
} else {
    Write-Host "No previous snapshot found. Run again later to see changes."
}

Write-Host ""
Write-Host "============================================"
Write-Host "  Analysis Complete"
Write-Host ("  Snapshots stored: {0}" -f $allSnapshots.Count)
Write-Host "============================================"
