---
name: vin-code-review
description: Generic Gemini Code Assist review workflow. Auto-detects or creates GitHub repo, pushes code, creates PR, polls for Gemini review, fixes medium+ issues, and loops up to 3 rounds. Works with any repo.
---

# Gemini Review Fix Workflow

Automated review-fix loop using Gemini Code Assist on GitHub. Works with **any repository** — detects context automatically.

## When to Activate

- When the user says "code review", "Gemini review", "fix Gemini review", or "check PR review"
- After creating a PR on GitHub
- When the user wants AI-assisted code review on their current changes

## Workflow

### Step 0: Detect Environment

Before anything else, detect the repo context dynamically. **Never hardcode** owner, repo, remote names, or branch names.

```bash
# Detect default branch
DEFAULT_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
if [ -z "$DEFAULT_BRANCH" ]; then
  # Fallback: try common names
  for branch in main master; do
    if git show-ref --verify --quiet refs/remotes/origin/$branch 2>/dev/null; then
      DEFAULT_BRANCH=$branch
      break
    fi
  done
fi

# Detect current branch
CURRENT_BRANCH=$(git branch --show-current)

# Detect GitHub remote
# Priority: "github" remote > "origin" remote > first remote with github.com
GITHUB_REMOTE=""
for remote in github origin $(git remote); do
  URL=$(git remote get-url "$remote" 2>/dev/null)
  if echo "$URL" | grep -q "github.com"; then
    GITHUB_REMOTE="$remote"
    break
  fi
done

# If a GitHub remote exists, extract owner/repo
if [ -n "$GITHUB_REMOTE" ]; then
  GITHUB_URL=$(git remote get-url "$GITHUB_REMOTE")
  # Handle both HTTPS and SSH URLs
  OWNER_REPO=$(echo "$GITHUB_URL" | sed -E 's#.*github\.com[:/]##; s/\.git$//')
  OWNER=$(echo "$OWNER_REPO" | cut -d/ -f1)
  REPO=$(echo "$OWNER_REPO" | cut -d/ -f2)
fi
```

If `GITHUB_REMOTE` is empty, proceed to Step 0a. Otherwise skip to Step 1.

### Step 0a: Create GitHub Repo (if needed)

Only runs when no GitHub remote is detected.

1. **Get GitHub username**:
```bash
GH_USER=$(gh api user --jq '.login')
```

2. **Detect repo name** from the current directory:
```bash
REPO=$(basename "$(git rev-parse --show-toplevel)")
```

3. **Check if repo already exists on GitHub**:
```bash
gh repo view "$GH_USER/$REPO" --json name 2>/dev/null
```

4. **Create if it doesn't exist** (default: private):
```bash
gh repo create "$GH_USER/$REPO" --private --source=. --push
```

5. **Add GitHub remote** if `origin` points elsewhere (e.g., GitLab):
```bash
# If origin is non-GitHub, add a "github" remote
if ! echo "$(git remote get-url origin 2>/dev/null)" | grep -q "github.com"; then
  git remote add github "https://github.com/$GH_USER/$REPO.git"
  GITHUB_REMOTE="github"
else
  GITHUB_REMOTE="origin"
fi
OWNER="$GH_USER"
```

6. **Push all branches and tags**:
```bash
git push -u "$GITHUB_REMOTE" "$CURRENT_BRANCH"
```

### Step 0b: Create PR (if needed)

Check if a PR already exists for the current branch:

```bash
EXISTING_PR=$(gh pr list --repo "$OWNER/$REPO" --head "$CURRENT_BRANCH" --json number --jq '.[0].number')
```

If no PR exists and there are changes to review:

1. **Create a feature branch** if on the default branch:
```bash
if [ "$CURRENT_BRANCH" = "$DEFAULT_BRANCH" ]; then
  FEATURE_BRANCH="review/$(date +%Y%m%d-%H%M%S)"
  git checkout -b "$FEATURE_BRANCH"
  git push -u "$GITHUB_REMOTE" "$FEATURE_BRANCH"
  CURRENT_BRANCH="$FEATURE_BRANCH"
fi
```

2. **Commit any uncommitted changes** (ask user first if there are staged/unstaged changes).

3. **Push and create PR**:
```bash
git push -u "$GITHUB_REMOTE" "$CURRENT_BRANCH"
PR_NUMBER=$(gh pr create --repo "$OWNER/$REPO" \
  --base "$DEFAULT_BRANCH" \
  --head "$CURRENT_BRANCH" \
  --title "Review: $(git log -1 --format='%s')" \
  --body "Automated PR for Gemini Code Assist review." \
  --json number --jq '.number' 2>/dev/null || \
  gh pr list --repo "$OWNER/$REPO" --head "$CURRENT_BRANCH" --json number --jq '.[0].number')
```

If a PR already exists, use it:
```bash
PR_NUMBER="$EXISTING_PR"
```

### Step 1: Fetch Gemini Review

Poll for the initial review. Wait up to 5 minutes (poll every 30s).

```bash
for i in $(seq 1 10); do
  REVIEW_COUNT=$(gh api repos/$OWNER/$REPO/pulls/$PR_NUMBER/reviews \
    --jq '[.[] | select(.user.login == "gemini-code-assist[bot]")] | length')
  if [ "$REVIEW_COUNT" -gt "0" ]; then break; fi
  sleep 30
done

if [ "$REVIEW_COUNT" -eq "0" ]; then
  echo "Gemini did not review within 5 minutes. Check manually."
  exit 1
fi

REVIEW_ID=$(gh api repos/$OWNER/$REPO/pulls/$PR_NUMBER/reviews \
  --jq '[.[] | select(.user.login == "gemini-code-assist[bot]")] | last | .id')

gh api repos/$OWNER/$REPO/pulls/$PR_NUMBER/reviews/$REVIEW_ID/comments \
  --jq '[.[] | {id: .id, path: .path, line: .line, body: .body}]'
```

### Step 2: Triage Comments

For each comment:
1. Read the referenced file and line
2. Assess severity (CRITICAL / HIGH / MEDIUM / LOW / INFO)
3. **Fix**: MEDIUM and above
4. **Skip**: LOW and INFO — leave a reply explaining why

### Step 3: Fix Issues

- Read the file referenced in each comment
- Apply the fix using Edit tool
- Batch all fixes — do NOT push after each individual fix
- Run build verification to confirm no regressions:
  - For TypeScript/JS projects: `npx tsc --noEmit` or the project's build command
  - For other projects: use the appropriate build/lint command
- Do NOT introduce new issues

### Step 4: Resolve Conversations

Use GraphQL `reviewThreads` query to get thread IDs (NOT comment node IDs — those are `PRRC_*` and will fail). Thread IDs are `PRRT_*`.

```bash
gh api graphql -f query='query {
  repository(owner: "'"$OWNER"'", name: "'"$REPO"'") {
    pullRequest(number: '"$PR_NUMBER"') {
      reviewThreads(first: 50) {
        nodes {
          id
          isResolved
          comments(first: 1) {
            nodes { author { login } body }
          }
        }
      }
    }
  }
}' --jq '.data.repository.pullRequest.reviewThreads.nodes[]
  | select(.isResolved == false)
  | select(.comments.nodes[0].author.login == "gemini-code-assist")
  | .id'
```

For each fixed thread, resolve it:

```bash
gh api graphql -f query='
  mutation {
    resolveReviewThread(input: {threadId: "PRRT_thread_id_here"}) {
      thread { isResolved }
    }
  }
'
```

For skipped comments (LOW/INFO), reply with the reason:

```bash
gh api repos/$OWNER/$REPO/pulls/$PR_NUMBER/comments/{comment_id}/replies \
  -f body="Intentionally not fixed: <reason>"
```

### Step 5: Push Fixes

Batch all fixes from the round into a single commit:

```bash
git add <all-changed-files>
git commit -m "fix: address Gemini Code Assist review feedback (round N)"
git push "$GITHUB_REMOTE" "$CURRENT_BRANCH"
```

### Step 6: Loop (max 3 rounds)

After pushing, record the current review count, then poll for a new review:

```bash
OLD_COUNT=$(gh api repos/$OWNER/$REPO/pulls/$PR_NUMBER/reviews \
  --jq '[.[] | select(.user.login == "gemini-code-assist[bot]")] | length')

for i in $(seq 1 5); do
  sleep 30
  NEW_COUNT=$(gh api repos/$OWNER/$REPO/pulls/$PR_NUMBER/reviews \
    --jq '[.[] | select(.user.login == "gemini-code-assist[bot]")] | length')
  if [ "$NEW_COUNT" -gt "$OLD_COUNT" ]; then break; fi
done
```

1. If new review appeared, fetch new inline comments and triage
2. If new medium+ issues found, fix and push again
3. If no new review or zero unresolved threads, proceed to merge
4. Repeat up to 3 rounds total
5. After 3 rounds with unresolved medium+ issues, stop and report status to user

### Step 7: Auto-Merge or Escalate

**Auto-merge** if zero MEDIUM+ issues remain after any round:

```bash
gh pr merge $PR_NUMBER --repo "$OWNER/$REPO" --squash --delete-branch
git checkout "$DEFAULT_BRANCH"
git pull "$GITHUB_REMOTE" "$DEFAULT_BRANCH"
```

If the repo has a secondary remote (e.g., GitLab `origin`), also sync:
```bash
# Only if origin is non-GitHub
ORIGIN_URL=$(git remote get-url origin 2>/dev/null)
if [ -n "$ORIGIN_URL" ] && ! echo "$ORIGIN_URL" | grep -q "github.com"; then
  git push origin "$DEFAULT_BRANCH"
fi
```

**Escalate to user** if MEDIUM+ issues remain after 3 rounds — report what's unresolved and ask for decision.

## Rules

- **Never hardcode** owner, repo, remote names, or branch names — always detect dynamically
- Never fix LOW/INFO issues unless explicitly asked
- Always run build verification before pushing
- Never amend commits — create new ones
- Batch all fixes in a round into a single commit
- Report what was fixed and what was skipped with reasons
- Maximum 3 review-fix rounds
- Auto-merge if zero MEDIUM+ issues remain after any round
- After 3 rounds with unresolved MEDIUM+ issues, stop for human decision
- Timeout: if Gemini doesn't review within 5 minutes, notify user and stop
- Default to private when creating new GitHub repos
- Ask user before committing uncommitted changes
