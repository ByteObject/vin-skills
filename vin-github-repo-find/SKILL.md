---
name: vin-github-repo-find
description: Search GitHub for repositories matching a description or keyword using gh CLI. Use when the user wants to find repos by topic, language, or description. Triggers on queries like "find a github repo for X", "search repos about Y", "what repo does Z".
---

# GitHub Repo Find

Search GitHub for repositories matching a description using `gh` CLI (must be authenticated).

## Workflow

### Step 1: Extract Keywords

Parse the user's description into search terms. Focus on nouns and technical terms, drop filler words.

### Step 2: Search Repositories

```bash
# Basic keyword search
gh search repos "KEYWORDS" --limit 10 --json fullName,description,stargazersCount,url,language,updatedAt

# With language filter
gh search repos "KEYWORDS" --language typescript --limit 10 --json fullName,description,stargazersCount,url,language,updatedAt

# Sort by stars (most popular first)
gh search repos "KEYWORDS" --sort stars --order desc --limit 10 --json fullName,description,stargazersCount,url,language,updatedAt
```

### Step 3: Present Results

Format as a ranked list by stars:

```
Found X repos matching "description":

1. owner/repo-name (⭐ 12.3k) [TypeScript]
   Short description here.
   https://github.com/owner/repo-name

2. owner/repo-name2 (⭐ 4.1k) [Python]
   Short description here.
   https://github.com/owner/repo-name2
```

### Step 4: Drill Down (Optional)

If the user wants more info on a specific repo:

```bash
gh repo view owner/repo --json name,description,readme,topics,stargazersCount,languages
```

## Tips

- **Default sort by stars** — most popular repos are usually most relevant
- **Try broader terms first**, then narrow with `--language` or `--topic`
- **Use `--topic`** for precise category matching: `gh search repos --topic "state-management" --limit 10`
- **Combine topic + keyword** for best results
- **If < 3 results**, retry with fewer/broader keywords

## Advanced Patterns

```bash
# Search by topic tag
gh search repos --topic "llm-agent" --sort stars --limit 10 --json fullName,description,stargazersCount,url

# Search with multiple keywords (AND logic)
gh search repos "event broker queue nodejs" --sort stars --limit 10 --json fullName,description,stargazersCount,url,language

# Filter by language + keyword
gh search repos "pdf parser" --language python --sort stars --limit 10 --json fullName,description,stargazersCount,url
```
