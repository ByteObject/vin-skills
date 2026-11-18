---
name: vin-github-star-file
description: File newly-starred GitHub repos into the user's 32 curated star lists (github.com/itisvincent). Diffs current stars against the local ledger, classifies new repos with the 32-list rubric, writes list memberships via Chrome DevTools MCP, updates the ledger, and reports. Use when the user says "file my new stars", "classify my new stars", "file/place unlisted stars", "sort my stars into lists", or mentions having starred repos without assigning a list.
---

# File New GitHub Stars

File every starred-but-unfiled repo on github.com/itisvincent into exactly one of the 32 curated star lists. Policy: **one list per repo** (single-homed), classification decided by the rubric — never by guessing from the repo name alone when metadata exists.

## Data files (fixed absolute paths)

All under `C:\Users\Vincent\github-stars-backup\` (call it `<DIR>`):

- `assignments.json` — the ledger: `{"owner/repo": "slug"}` for every filed star (~3900 entries). Source of truth for what has been filed.
- `RUBRIC.md` — full definitions of the 32 categories + 14 precedence rules. Read the relevant parts before classifying.
- `slug_to_id.json` — category slug → GitHub physical list id. Ids are stable forever; display names and URL slugs change, so never rely on those.

## Workflow

### 1. Fetch current stars

```bash
gh api --paginate user/starred --jq '.[] | {n:.full_name, d:((.description // "")[0:220]), l:(.language // ""), t:((.topics // [])[0:8])}' > <DIR>/stars_now.jsonl
```

### 2. Diff against the ledger

```bash
node <skill>/scripts/diff_stars.mjs <DIR>/assignments.json <DIR>/stars_now.jsonl
```

Prints `{counts, new, removed}`. Resolve before classifying:

- **Renames** — the same repo can appear in `removed` (old name) and `new` (new name). For each `removed` entry run `gh api repos/{old}`: if it redirects to a `full_name` present in `new`, it is a rename → move the ledger key, and NO GitHub write is needed (list membership follows the repo id through renames).
- **Unstarred** — `removed` entries that are genuinely no longer starred → delete from ledger. CAUTION: DMCA/tos-blocked repos (`gh api repos/{r}` returns a `block` object) vanish from the gh star feed but ARE still starred and listed — keep their ledger entries.
- **Already listed** — a `new` repo may already have a live list (user filed it manually, or an earlier pass did). The step-4 fragment GET reveals this: if `selected` is non-empty, respect it — record that list in the ledger, do not move it.

If `new` is empty after rename resolution, report "all stars filed" and stop.

### 3. Classify the truly new repos

Read `<DIR>/RUBRIC.md`, then assign each repo exactly ONE slug from its metadata (description, language, topics). If metadata is too thin, `gh api repos/{r}` for full details or skim the README. Apply the rubric precedence rules on overlap. Quick tie-breakers for the known adjacent zones:

| Repo is… | Slug |
|---|---|
| runnable coding agent / AI dev tool | coding-agents-clis |
| content plugged into an agent (SKILL.md, plugins, prompt packs) | agent-skills-plugins |
| library imported to build agents | agent-frameworks-sdks |
| exposes tools over MCP | mcp-servers-tooling |
| end-user LLM chat app | ai-chat-uis-clients |
| deployable end-user server app | self-hosted-apps-homelab |
| mobile framework (RN/Flutter/Ionic/taro-like) | mobile-native-apps |
| backend/server framework (Express-likes) | api-auth-backend |
| desktop GUI app or Electron/Tauri shell | desktop-system-utilities |
| general framework / runtime / bundler / language tooling | web-frameworks-build-tools |
| clone-and-go template or starter | app-boilerplates-clones |
| tutorial, course, awesome/curated list | learning-awesome-lists |

Record a confidence per repo (high/med/low); low-confidence picks must be flagged in the final report so the user can veto.

### 4. Write memberships via Chrome DevTools MCP

Read [references/write-mechanism.md](references/write-mechanism.md) FIRST and follow it exactly — the endpoints are unofficial and header-sensitive (wrong Accept header → 406; unpaced writes → 429 abuse limit; SET-vs-union mistakes double-list repos).

Summary: select/open a github.com tab logged in as `itisvincent`; per repo GET the lists fragment (yields CSRF token + repo id + current selection), skip if already correct, POST a SET of exactly one list id. For ≤20 repos write sequentially with ~700 ms pacing; for more, use the fire-and-forget batch writer from the reference.

### 5. Update ledger + report

Apply to `assignments.json`: add new entries (repo → slug), move rename keys, delete unstars. Then report to the user:

- table: repo → list display name, one-line reason, ⚠ marker on low-confidence rows
- counts: filed / already-listed / renamed / unstarred / errors
- any repo that could not be filed (deleted, blocked) and why

## Edge cases

- Repo 404 at write time: deleted since starring — skip, note in report.
- HTTP 451 or `block` object from gh: DMCA/tos-blocked — cannot be modified, leave as is.
- 429 on any write: STOP immediately (retrying keeps the limit window alive), tell the user; safe to resume after ~30 min — writes are idempotent.
- Chrome MCP not connected: ask the user to reconnect it; the gh + diff + classify steps still work, so a "pending filing" report can be produced meanwhile.
