---
name: vin-github-star-search
description: Search through GitHub starred repositories using gh CLI. Use when the user wants to find, filter, or list their starred repos by keyword, topic, or language. Triggers on queries like "find my starred repo about X", "search my stars for Y", "list starred repos related to Z", "which repos did I star about X".
---

# GitHub Star Search

Search starred repositories using `gh` CLI (must be authenticated).

## Workflow

1. Fetch all starred repos with names AND descriptions (MUST include descriptions to avoid missing relevant repos):
   ```bash
   gh api user/starred --paginate --jq '.[] | "\(.full_name) ||| \(.description // "")"'
   ```
   Save output to a temp file. Use timeout of 300000ms as users may have thousands of stars.

2. Filter results with `grep -i <keyword>` on the full output (matches both name and description).

3. Present results as a numbered table with repo name and description columns.

4. If the user needs more detail on specific repos:
   ```bash
   gh repo view <owner/repo> --json description,url,stargazersCount,language,topics
   ```

## Tips

- ALWAYS search both name and description — many relevant repos only mention the keyword in description.
- Always use `--paginate` — the API returns only 30 per page by default.
- For broad searches, try multiple grep patterns (e.g., both "sandbox" and "sand-box").
- If no matches found, suggest alternative keywords or partial matches.
