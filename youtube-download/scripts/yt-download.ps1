<#
.SYNOPSIS
  Download a YouTube video, auto-escalating to the PO-token/cookies pipeline for gated content.
.NOTES
  Tiers tried in order (unless -Gated forces the last): plain -> +EJS solver -> gated (cookies+bgutil+EJS).
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$Url,
  [string]$Cookies,
  [string]$Format,
  [int]$Quality,                                   # cap height, e.g. 1080
  [string]$OutDir = "$env:USERPROFILE\Downloads",
  [string]$PlayerClient = 'web_safari',
  [switch]$Gated,
  [switch]$Simulate,
  [string]$BgutilDir = "$env:USERPROFILE\bgutil-ytdlp-pot-provider",
  [int]$Port = 4416
)
# Use Continue (not Stop): yt-dlp writes warnings to stderr, and under 'Stop' the 2>&1
# merge would convert them to terminating errors. Success is judged by $LASTEXITCODE.
# Explicit `throw` statements below still terminate regardless of this setting.
$ErrorActionPreference = 'Continue'

function Resolve-YtDlp {
  $c = Get-Command yt-dlp -ErrorAction SilentlyContinue
  if ($c) { return $c.Source }
  try { $bin = (uv tool dir --bin) 2>$null } catch {}
  if ($bin) { $p = Join-Path $bin 'yt-dlp.exe'; if (Test-Path $p) { return $p } }
  throw "yt-dlp not found. Run scripts\setup.ps1 first."
}

function Test-PoServer([int]$Port) {
  foreach ($h in "http://[::1]:$Port", "http://127.0.0.1:$Port") {
    try { $r = Invoke-WebRequest "$h/ping" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
          if ($r.StatusCode -eq 200) { return $h } } catch {}
  }
  return $null
}

function Start-PoServer([string]$BgutilDir, [int]$Port) {
  $base = Test-PoServer $Port
  if ($base) { return $base }
  $deno = (Get-Command deno -ErrorAction SilentlyContinue).Source
  if (-not $deno) { $deno = "$env:USERPROFILE\.deno\bin\deno.exe" }
  if (-not (Test-Path $deno)) { throw "deno not found (needed for bgutil PO-token server)." }
  $main = Join-Path $BgutilDir 'server\src\main.ts'
  if (-not (Test-Path $main)) { throw "bgutil server not found at $main. Run scripts\setup.ps1." }
  Write-Host "[po] starting bgutil PO-token server..."
  Start-Process -FilePath $deno -ArgumentList @('run','-A',$main) -WindowStyle Hidden | Out-Null
  for ($i=0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 1500
    $base = Test-PoServer $Port
    if ($base) { Write-Host "[po] server up at $base"; return $base }
  }
  throw "bgutil PO-token server did not come up on port $Port."
}

function Build-Args([string]$mode, [string]$base) {
  $a = @()
  if ($Format)  { $a += @('-f', $Format) }
  elseif ($Quality) { $a += @('-S', "res:$Quality") }
  $a += @('--merge-output-format','mp4','-P',$OutDir,'-o','%(title)s [%(id)s].%(ext)s','--newline')
  if ($Simulate) { $a += '--simulate' }
  if ($mode -ne 'plain') { $a += @('--remote-components','ejs:github') }
  if ($mode -eq 'gated') {
    if (-not $Cookies) { throw "NEED_COOKIES" }
    if (-not (Test-Path $Cookies)) { throw "Cookies file not found: $Cookies" }
    $ea = "youtube:player_client=$PlayerClient;youtubepot-bgutilhttp:base_url=$base"
    $a += @('--cookies', $Cookies, '--extractor-args', $ea)
  }
  $a += $Url
  return ,$a
}

$exe = Resolve-YtDlp
# [string[]] cast prevents a single-element array from being unwrapped to a scalar string.
[string[]]$tiers = if ($Gated) { ,'gated' } else { 'plain','ejs','gated' }

$gatedRe = 'members-only|Join this channel|cookies are no longer valid|Sign in to confirm|available to .* members'
$ejsRe   = 'Only images are available|Requested format is not available|n challenge|nsig|challenge solver|page needs to be reloaded'

for ($t=0; $t -lt $tiers.Count; $t++) {
  $mode = $tiers[$t]
  $base = $null
  if ($mode -eq 'gated') {
    if (-not $Cookies) {
      Write-Warning "This video is gated (members-only / PO-token). Re-run with -Cookies <incognito cookies.txt> -Gated. See references\troubleshooting.md."
      exit 2
    }
    $base = Start-PoServer $BgutilDir $Port
  }
  $dlArgs = Build-Args $mode $base
  Write-Host "[try] tier='$mode'"
  $out = & $exe @dlArgs 2>&1 | Tee-Object -Variable lines | Out-String
  if ($LASTEXITCODE -eq 0) {
    Write-Host "`n[ok] download complete (tier=$mode)."
    exit 0
  }
  # decide whether/where to escalate
  if ($t -lt $tiers.Count - 1) {
    if ($out -match $gatedRe) {
      Write-Host "[escalate] gated content detected -> cookies/PO-token tier"
      $tiers = @('plain','ejs','gated'); $t = 1   # next loop sets mode='gated' (index 2)
      continue
    }
    if ($out -match $ejsRe) { Write-Host "[escalate] challenge/format issue -> next tier"; continue }
    Write-Warning "yt-dlp failed (tier=$mode) without a recognized gating signal:`n$out"
    exit 1
  }
  Write-Warning "yt-dlp failed on final tier (=$mode):`n$out"
  exit 1
}
