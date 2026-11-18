# Shared paths for the narrated-explainer scripts. Source it: . "$(dirname "$0")/env.sh"
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NE_CACHE="$HOME/.cache/narrated-explainer"
NE_VENV="$NE_CACHE/venv"
if [ -x "$NE_VENV/Scripts/python.exe" ]; then NE_PY="$NE_VENV/Scripts/python.exe"; NE_BIN="$NE_VENV/Scripts"; else NE_PY="$NE_VENV/bin/python"; NE_BIN="$NE_VENV/bin"; fi
NE_ZH_FONT="$NE_CACHE/fonts/LXGWWenKaiTC-Medium.ttf"
# native path for tools that run outside the POSIX shell (Windows Python, hyperframes tts)
winpath() { if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1"; else printf '%s' "$1"; fi; }
# hyperframes tts runs Kokoro through this interpreter
export HYPERFRAMES_PYTHON="$(winpath "$NE_PY")"
export HF_HUB_DISABLE_SYMLINKS_WARNING=1
# voice and speed: VOICE= / SPEED= env, else video.config.mjs in the current directory, else af_heart 0.95
ne_cfg() { [ -f video.config.mjs ] && node -e "import('./video.config.mjs').then(m => console.log(m.default['$1'] ?? ''))" 2>/dev/null || true; }
ne_voice() { VOICE="${VOICE:-$(ne_cfg voice)}"; VOICE="${VOICE:-af_heart}"; SPEED="${SPEED:-$(ne_cfg speed)}"; SPEED="${SPEED:-0.95}"; }
