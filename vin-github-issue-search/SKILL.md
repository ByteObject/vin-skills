---
name: vin-github-issue-search
description: Search GitHub issues in any repository using gh CLI. Use when the user wants to find issues by keyword, label, state, or author. Triggers on queries like "search issues in <repo> for X", "find authentication issues in <repo>", "show open bugs in <repo>", "list issues about Y in <repo>".
---

# GitHub Issue Search

Search issues in any GitHub repository using `gh` CLI (must be authenticated).

## Workflow

### Step 1: Parse Repository

Extract owner/repo from the provided URL or full name:

```bash
# From URL: https://github.com/owner/repo
REPO_URL="https://github.com/owner/repo"
OWNER_REPO=$(echo "$REPO_URL" | sed -E 's#.*github\.com/##; s#\.git$##; s#/$##')

# Or use directly if provided as "owner/repo"
OWNER_REPO="owner/repo"
```

### Step 2: Search Issues

Use `gh issue list` with search filters:

```bash
# Basic search by keyword in title/body
gh issue list --repo "$OWNER_REPO" --search "authentication" --limit 50

# Search with state filter (open/closed/all)
gh issue list --repo "$OWNER_REPO" --search "authentication" --state open --limit 50

# Search with label filter
gh issue list --repo "$OWNER_REPO" --label "bug" --search "authentication" --limit 50

# Search by author
gh issue list --repo "$OWNER_REPO" --author "username" --limit 50

# Combine multiple filters
gh issue list --repo "$OWNER_REPO" \
  --search "authentication" \
  --state open \
  --label "bug,security" \
  --limit 50 \
  --json number,title,state,labels,author,createdAt,updatedAt,url \
  --jq '.[] | "\(.number)|\(.title)|\(.state)|\(.author.login)|\(.createdAt)|\(.url)"'
```

### Step 3: Present Results

Format results as a numbered table:

```
| # | Issue | State | Author | Created | URL |
|---|-------|-------|--------|---------|-----|
| 1 | #123: Authentication fails with OAuth | OPEN | user1 | 2024-01-15 | https://... |
| 2 | #456: Login timeout issue | CLOSED | user2 | 2024-01-10 | https://... |
```

### Step 4: View Issue Details (Optional)

If the user wants more details on a specific issue:

```bash
gh issue view <number> --repo "$OWNER_REPO" --json title,body,state,labels,author,comments,createdAt,updatedAt,url
```

Or view in browser:

```bash
gh issue view <number> --repo "$OWNER_REPO" --web
```

## Advanced Search Patterns

### Search by Date Range

```bash
# Issues created after a date
gh issue list --repo "$OWNER_REPO" --search "created:>2024-01-01"

# Issues updated in the last week
gh issue list --repo "$OWNER_REPO" --search "updated:>=$(date -d '7 days ago' +%Y-%m-%d)"
```

### Search by Multiple Keywords

```bash
# AND logic (all keywords must match)
gh issue list --repo "$OWNER_REPO" --search "authentication login"

# OR logic (any keyword matches) - use multiple searches and combine
gh issue list --repo "$OWNER_REPO" --search "authentication" > /tmp/issues1.txt
gh issue list --repo "$OWNER_REPO" --search "login" > /tmp/issues2.txt
cat /tmp/issues1.txt /tmp/issues2.txt | sort -u
```

### Search by Assignee or Mentions

```bash
# Issues assigned to someone
gh issue list --repo "$OWNER_REPO" --assignee "username"

# Issues mentioning someone
gh issue list --repo "$OWNER_REPO" --search "mentions:username"
```

### Search in Comments

```bash
# Search in issue comments (not just title/body)
gh issue list --repo "$OWNER_REPO" --search "authentication in:comments"
```

## Common Use Cases

### Find Open Bugs

```bash
gh issue list --repo "$OWNER_REPO" --label "bug" --state open --limit 50
```

### Find Issues Needing Help

```bash
gh issue list --repo "$OWNER_REPO" --label "help wanted,good first issue" --state open
```

### Find Stale Issues

```bash
gh issue list --repo "$OWNER_REPO" --search "updated:<$(date -d '90 days ago' +%Y-%m-%d)" --state open
```

### Find High Priority Issues

```bash
gh issue list --repo "$OWNER_REPO" --label "priority:high,critical" --state open
```

## Error Handling

### Repository Not Found

```bash
if ! gh repo view "$OWNER_REPO" &>/dev/null; then
  echo "Error: Repository '$OWNER_REPO' not found or not accessible."
  echo "Make sure you have access and the repo name is correct."
  exit 1
fi
```

### No Issues Found

If search returns empty results:
1. Suggest broader search terms
2. Try removing filters (state, labels)
3. Check if the repo has any issues at all: `gh issue list --repo "$OWNER_REPO" --limit 1`

### Rate Limiting

If hitting GitHub API rate limits:
```bash
gh api rate_limit --jq '.resources.core | "Remaining: \(.remaining)/\(.limit), Resets at: \(.reset | strftime("%Y-%m-%d %H:%M:%S"))"'
```

## Tips

- **Default to open issues** unless user specifies otherwise
- **Use `--limit 50`** to avoid overwhelming output (default is 30)
- **Always include issue number and URL** in results for easy access
- **Search is case-insensitive** by default
- **Combine filters** for precise results (state + label + keyword)
- **Use `--json` output** for programmatic processing and custom formatting
- **Check repo accessibility** before searching to provide better error messages
- **For very active repos**, narrow search with labels or date ranges to get relevant results

## Output Format

Present results in this format:

```
Found X issues in owner/repo matching "search query":

1. #123 [OPEN] Authentication fails with OAuth
   Author: user1 | Created: 2024-01-15 | Labels: bug, security
   https://github.com/owner/repo/issues/123

2. #456 [CLOSED] Login timeout issue
   Author: user2 | Created: 2024-01-10 | Labels: bug
   https://github.com/owner/repo/issues/456

---
Use `gh issue view <number> --repo owner/repo` for full details.
```

## Integration with Other Skills

Can be combined with:
- **vin-github-star-search**: Search starred repos first, then search issues in found repos
- **vin-code-review**: Find related issues before creating PRs
- **General workflow**: Search issues → Read issue details → Create fix → Reference issue in commit
