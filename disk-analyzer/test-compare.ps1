param(
    [string]$SnapshotDir = "$PSScriptRoot\snapshots"
)

# Helpers copied verbatim from diskscan.ps1. Keep in sync.
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

$snapshots = @(Get-ChildItem $SnapshotDir -Filter "*.json" | Sort-Object Name)
if ($snapshots.Count -lt 2) {
    Write-Host "Need at least 2 snapshots to test (found $($snapshots.Count) in $SnapshotDir)."
    exit 1
}

$curJson  = Get-Content $snapshots[-1].FullName -Raw | ConvertFrom-Json
$prevJson = Get-Content $snapshots[-2].FullName -Raw | ConvertFrom-Json

# Simulate the real runtime: current snapshot is a Hashtable built in memory,
# previous is a PSCustomObject from JSON. This is the exact type mismatch the
# buggy code failed to handle.
$curHash = @{}
foreach ($p in $curJson.folders.PSObject.Properties) { $curHash[$p.Name] = $p.Value }

$curFolders  = $curHash
$prevFolders = $prevJson.folders

Write-Host "Current type:  $($curFolders.GetType().Name)"
Write-Host "Previous type: $($prevFolders.GetType().Name)"

$curKeys  = Get-FolderKeys $curFolders
$prevKeys = Get-FolderKeys $prevFolders
Write-Host ("Current keys:  {0}" -f $curKeys.Count)
Write-Host ("Previous keys: {0}" -f $prevKeys.Count)

$forbidden = @('Count','Keys','Values','SyncRoot','IsSynchronized','IsReadOnly','IsFixedSize')
$leak = $curKeys | Where-Object { $forbidden -contains $_ }
if ($leak) {
    Write-Host "FAIL: hashtable internals leaked into current keys: $($leak -join ', ')"
    exit 2
}
Write-Host "OK: no hashtable internals in current keys"

$allKeys = @($curKeys + $prevKeys) | Sort-Object -Unique
$changes = @()
foreach ($key in $allKeys) {
    $nowMB  = Get-FolderValue $curFolders  $key
    $prevMB = Get-FolderValue $prevFolders $key
    $delta = $nowMB - $prevMB
    if ([math]::Abs($delta) -gt 50) {
        $changes += [PSCustomObject]@{ Folder = $key; Before = $prevMB; After = $nowMB; Delta = $delta }
    }
}

Write-Host ""
Write-Host ("Significant changes (>50 MB): {0}" -f $changes.Count)
$changes | Sort-Object Delta -Descending | Select-Object -First 10 | ForEach-Object {
    $sign = if ($_.Delta -gt 0) { "+" } else { "" }
    Write-Host ("  {0,-40} {1,8} -> {2,8} MB   ({3}{4} MB)" -f $_.Folder, $_.Before, $_.After, $sign, $_.Delta)
}

$bogus = @($changes | Where-Object { $_.Before -eq 0 -and $_.After -eq 0 })
if ($bogus.Count -gt 0) {
    Write-Host "FAIL: $($bogus.Count) entries with both sides zero"
    exit 3
}
Write-Host ""
Write-Host "PASS"
