# GitHub star-list write mechanism (unofficial endpoints — header-sensitive)

These endpoints require the user's logged-in browser session; `gh` CLI tokens do NOT work.
All calls run as same-origin `fetch` inside a github.com tab via `mcp__chrome-devtools__evaluate_script`.

## Preflight

1. `list_pages` — find a `github.com` tab; if none, `new_page` `https://github.com/itisvincent?tab=stars` (background: true), then `select_page` it.
2. Verify login inside the page: `document.querySelector('meta[name="user-login"]').content === 'itisvincent'`. Abort if not.

## Read a repo's current lists (also yields the write token)

```
GET https://github.com/{owner}/{repo}/lists?experimental=1
headers: X-Requested-With: XMLHttpRequest, Accept: text/html   (credentials: include)
```

Parse the returned HTML fragment:
- `input[name="authenticity_token"]` → per-repo CSRF token (fresh one needed per repo)
- `input[name="repository_id"]` or `[data-repository-id]` → repository_id
- `button[data-input-name="list_ids[]"][aria-selected="true"]` → `data-value` = currently-selected list ids

Statuses: 404 = repo deleted (skip), 429 = rate-limited (STOP).

## Write membership (SET semantics — never union)

```
POST https://github.com/{owner}/{repo}/lists
headers: Accept: */* , X-Requested-With: XMLHttpRequest,
         Content-Type: application/x-www-form-urlencoded   (credentials: include)
body (URLSearchParams):
  _method=put
  authenticity_token=<from fragment>
  repository_id=<from fragment>
  context=user_list_menu
  list_ids[]=<target list id>        ← exactly ONE id = single-home the repo
```

CRITICAL gotchas (learned the hard way):
- `Accept: text/html` on this POST → **406**. Must be `Accept: */*`. No Scoped-CSRF-Token needed here.
- Sending `list_ids[]` REPLACES the whole membership (SET). To file an unlisted repo send just the target id. Do NOT append to existing ids unless multi-homing is intended (it never is — policy is one list per repo).
- If the fragment's `selected` is already `[target]` → skip (no write).
- If `selected` is non-empty but different: the repo was filed by someone/something else — default is respect it (record in ledger), unless the run's explicit purpose is correcting misfiles.
- Pace ~700–900 ms between repos. Abuse limiter trips around ~1000 POSTs/window → 429. On 429: STOP (retries keep the window alive), wait ~30 min, resume — writes are idempotent.

## Single-repo write (canonical working code)

```js
async () => {
  const full = 'OWNER/REPO', target = 'LIST_ID';
  const fr = await fetch(`https://github.com/${full}/lists?experimental=1`, {
    headers: {'X-Requested-With':'XMLHttpRequest','Accept':'text/html'}, credentials:'include' });
  if (fr.status !== 200) return {ok:false, status:fr.status};
  const doc = new DOMParser().parseFromString(await fr.text(),'text/html');
  const tok = doc.querySelector('input[name="authenticity_token"]')?.value;
  const repoId = doc.querySelector('input[name="repository_id"]')?.value
              || doc.querySelector('[data-repository-id]')?.getAttribute('data-repository-id');
  const selected = [...doc.querySelectorAll('button[data-input-name="list_ids[]"][aria-selected="true"]')]
    .map(b => b.getAttribute('data-value'));
  if (selected.length === 1 && selected[0] === target) return {ok:true, action:'already'};
  const body = new URLSearchParams();
  body.append('_method','put'); body.append('authenticity_token', tok);
  body.append('repository_id', repoId); body.append('context','user_list_menu');
  body.append('list_ids[]', target);
  const pr = await fetch(`https://github.com/${full}/lists`, { method:'POST', credentials:'include',
    headers:{'Accept':'*/*','X-Requested-With':'XMLHttpRequest','Content-Type':'application/x-www-form-urlencoded'},
    body: body.toString() });
  return {ok: pr.status < 300, status: pr.status, was: selected};
}
```

## Batch writes (>20 repos): fire-and-forget writer

A single `evaluate_script` that loops many repos exceeds the MCP protocol timeout (~30–60 s) —
the call dies but the JS keeps running detached. Instead seed and start a detached loop, return
immediately, and poll:

```js
// seed + start (returns instantly)
async () => {
  window.__WP = [["owner/repo","LIST_ID"], ...];   // all pairs
  window.__PROG = {i:0, ok:0, skip:0, err:[], halted:false, done:false};
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const run = async () => {
    const P = window.__PROG, W = window.__WP;
    for (; P.i < W.length; P.i++) {
      const [full, target] = W[P.i];
      try {
        const fr = await fetch(`https://github.com/${full}/lists?experimental=1`,
          {headers:{'X-Requested-With':'XMLHttpRequest','Accept':'text/html'}, credentials:'include'});
        if (fr.status === 429) { P.halted = true; break; }
        if (fr.status !== 200) { P.err.push([full,'frag '+fr.status]); await sleep(500); continue; }
        const doc = new DOMParser().parseFromString(await fr.text(),'text/html');
        const tok = doc.querySelector('input[name="authenticity_token"]')?.value;
        const repoId = doc.querySelector('input[name="repository_id"]')?.value
                    || doc.querySelector('[data-repository-id]')?.getAttribute('data-repository-id');
        const sel = [...doc.querySelectorAll('button[data-input-name="list_ids[]"][aria-selected="true"]')].map(b=>b.getAttribute('data-value'));
        if (!tok || !repoId) { P.err.push([full,'no token']); await sleep(500); continue; }
        if (sel.length === 1 && sel[0] === target) { P.skip++; await sleep(300); continue; }
        const body = new URLSearchParams();
        body.append('_method','put'); body.append('authenticity_token', tok);
        body.append('repository_id', repoId); body.append('context','user_list_menu');
        body.append('list_ids[]', target);
        const pr = await fetch(`https://github.com/${full}/lists`, {method:'POST', credentials:'include',
          headers:{'Accept':'*/*','X-Requested-With':'XMLHttpRequest','Content-Type':'application/x-www-form-urlencoded'},
          body: body.toString()});
        if (pr.status === 429) { P.halted = true; break; }
        if (pr.status < 300) P.ok++; else P.err.push([full,'post '+pr.status]);
      } catch(e) { P.err.push([full, String(e).slice(0,80)]); }
      await sleep(650 + Math.floor(Math.random()*250));
    }
    P.done = true;
  };
  run();  // do NOT await
  return {seeded: window.__WP.length};
}

// poll (cheap, repeat every few minutes — use a background `sleep N` Bash timer between polls)
() => { const P = window.__PROG; return {i:P.i, ok:P.ok, skip:P.skip, err:P.err.length, halted:P.halted, done:P.done}; }
```

If the page reloads mid-run the loop dies silently (`window.__PROG` gone) — re-diff live state
against the plan to find the remaining set, then re-seed. Never re-run the full plan blind
(idempotent, but wastes the abuse-limit budget).

## Verify after writing

Re-GET the fragment for a sample (or all) written repos and assert `selected === [target]`.
