---
name: vin-github-star-search
description: Search through GitHub starred repositories using gh CLI. Use when the user wants to find, filter, or list their starred repos by keyword, topic, or language. Triggers on queries like "find my starred repo about X", "search my stars for Y", "list starred repos related to Z", "which repos did I star about X", "find similar repos to X".
---

# GitHub Star Search

Search starred repositories using `gh` CLI (must be authenticated).

## Workflow

1. Fetch all starred repos with names AND descriptions (MUST include descriptions to avoid missing relevant repos):
   ```bash
   gh api user/starred --paginate --jq '.[] | "\(.full_name) ||| \(.description // "")"' > /tmp/starred_repos.txt
   ```
   Save output to a temp file. Use timeout of 300000ms as users may have thousands of stars.

2. Filter results with `grep -i <keyword>` on the full output (matches both name and description).

3. Present results as a numbered table with repo name and description columns.

4. If the user needs more detail on specific repos:
   ```bash
   gh repo view <owner/repo> --json description,url,stargazersCount,language,topics
   ```

## "Find Similar" Queries

When the user asks to find repos **similar to** a specific repo, do NOT guess what the repo is about. Follow this process:

1. **Look up the target repo first** — search the starred list for the exact repo name, or fetch its metadata:
   ```bash
   gh repo view <owner/repo> --json description,topics,language --jq '{description, topics, language}'
   ```

2. **Extract search terms** from the repo's description AND topics. Break the description into individual meaningful keywords and short phrases. For example, if the description is "Open-source orchestration for zero-human companies", extract: `orchestration`, `zero-human`, `open-source`, `agent`, `automat`.

3. **Search for EACH keyword separately** against the starred repos file. Cast a wide net — run multiple grep passes:
   ```bash
   grep -i "keyword1" /tmp/starred_repos.txt
   grep -i "keyword2" /tmp/starred_repos.txt
   grep -i "keyword3" /tmp/starred_repos.txt
   ```

4. **Also search for synonyms and related concepts** that the description implies but doesn't explicitly state. Think about how DIFFERENT people describe the SAME concept. For example:
   - "orchestration" → also search "coordinat", "workflow", "pipeline", "dispatch"
   - "zero-human" → also search "autonomous", "automat", "no.human", "unmanned", "self.run"
   - "agents" → also search "agent", "multi.agent", "swarm", "crew", "teammate", "coworker", "colleague", "copilot", "assistant", "worker", "bot"
   - "platform" → also search "framework", "sdk", "toolkit", "infrastructure"
   - "tasks" → also search "task", "issue", "ticket", "assign", "job", "work"
   - "memory" → also search "context", "knowledge", "persist", "state", "recall"

5. **Use a broad OR-pattern grep** to search many synonyms at once instead of running them one by one:
   ```bash
   grep -iE "agent|teammate|coworker|copilot|assistant|worker" /tmp/starred_repos.txt
   grep -iE "orchestrat|coordinat|workflow|dispatch|pipeline" /tmp/starred_repos.txt
   grep -iE "autonom|automat|self.run|zero.human" /tmp/starred_repos.txt
   ```

6. **Combine, deduplicate, and rank** all results by relevance before presenting.

**Why this matters:** Repos that are conceptually similar often use completely different vocabulary. A repo described as "Turn coding agents into real teammates" is very similar to "orchestration for zero-human companies" but shares zero keywords. Searching only for obvious terms will miss these matches.

## Tips

- ALWAYS search both name and description — many relevant repos only mention the keyword in description.
- Always use `--paginate` — the API returns only 30 per page by default.
- For broad searches, try multiple grep patterns (e.g., both "sandbox" and "sand-box").
- If no matches found, suggest alternative keywords or partial matches.
- When in doubt, search MORE keywords rather than fewer. False positives are easy to filter out; false negatives are invisible.
