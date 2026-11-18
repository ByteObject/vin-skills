@echo off
REM ============================================================================
REM  download.bat  -  Archive one YouTube video to a channel folder.
REM
REM  Usage:
REM     download.bat "<youtube-url>" "<store-location>" [number]
REM
REM  Params:
REM     %1  YouTube video URL   (always quote it -- URLs contain & )
REM     %2  Store location      (destination channel folder; created if missing)
REM     %3  Optional sequence number (e.g. 41). Omit to auto-pick the next one.
REM
REM  Produces (clean shared base name "NN <title>"):
REM     NN <title>.txt   URL + blank line + video description
REM     NN <title>.mp4   best video+audio, merged to mp4
REM     NN <title>.srt   English subs (manual>auto); if none, Chinese only
REM
REM  Thin launcher: runs download.py via `uv run` (no real python is on PATH).
REM ============================================================================
setlocal
chcp 65001 >nul

if "%~1"=="" goto :usage
if "%~2"=="" goto :usage

uv run --no-project "%~dp0download.py" "%~1" "%~2" %~3
exit /b %ERRORLEVEL%

:usage
echo Usage: download.bat "^<youtube-url^>" "^<store-location^>" [number]
exit /b 1
