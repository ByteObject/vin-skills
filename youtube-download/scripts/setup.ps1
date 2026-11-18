<#
.SYNOPSIS
  One-time setup for the youtube-download skill: yt-dlp + bgutil PO-token provider.
.NOTES
  Prerequisites (must already be installed): uv, deno, git, ffmpeg.
#>
[CmdletBinding()]
param([string]$BgutilDir = "$env:USERPROFILE\bgutil-ytdlp-pot-provider")
$ErrorActionPreference = 'Stop'

function Need($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Required tool '$name' not found on PATH. Install it first (uv, deno, git, ffmpeg)."
  }
}
Need uv; Need deno; Need git
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
  Write-Warning "ffmpeg not on PATH — required for HLS download + merging. Install it before downloading."
}

Write-Host "[1/3] Installing yt-dlp (+ bgutil plugin) via uv..."
uv tool install yt-dlp --with bgutil-ytdlp-pot-provider --force

Write-Host "[2/3] Cloning bgutil PO-token provider -> $BgutilDir ..."
if (Test-Path "$BgutilDir\.git") { Write-Host "  already cloned" }
else { git clone --depth 1 https://github.com/Brainicism/bgutil-ytdlp-pot-provider $BgutilDir }

Write-Host "[3/3] Installing bgutil server deps (deno install)..."
Push-Location "$BgutilDir\server"
try { deno install } finally { Pop-Location }

$bin = (uv tool dir --bin) 2>$null
Write-Host "`nSetup complete."
Write-Host "  yt-dlp: $bin\yt-dlp.exe"
Write-Host "  bgutil: $BgutilDir"
Write-Host "Note: '$bin' may not be on PATH; the download script resolves it automatically."
