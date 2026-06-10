# Automation — this repo maintains itself

PocketShelf doubles as a testbed for the Claude Code automation stack. Three
tiers, each removing a different reason for a human to babysit the repo.
Unattended permissions live in [`.claude/settings.json`](../.claude/settings.json)
(allowlist: builds, tests, read-only `gh`; denylist: force-push, `--no-verify`,
hard reset, `.env`).

## Tier 1 — `/loop` (session-scoped CI babysitter)

Used during active development. Run inside a Claude Code session at the repo root:

```
/loop 15m Check the latest GitHub Actions run on JBratzi/pocketshelf with
`gh run list`. If it failed: read the logs with `gh run view --log-failed`,
diagnose, fix the code locally, verify with `npm run build` and
`cargo check && cargo test` in src-tauri, commit and push the fix.
STOP CONDITION: when the latest run on main is green for 2 consecutive
checks, report "CI green, babysitter retiring" and delete this loop.
Budget: keep each iteration under 10k output tokens.
```

Notes: session-scoped (dies with the terminal), auto-expires in 7 days,
explicit stop condition in the prompt so it retires itself instead of
polling forever.

## Tier 2 — Desktop scheduled task (persistent, local)

Create in Claude Desktop: **Schedule → New task**, working folder this repo,
model Sonnet (set explicitly — don't inherit the panel default), weekdays 07:00.

```
PocketShelf morning check. In this repo: (1) gh issue list --limit 20 — new
issues since yesterday, one-line triage each; (2) gh run list --limit 5 —
CI health on main; (3) gh pr list — open PRs needing attention; (4) npm
outdated and cargo update --dry-run in src-tauri — flag major version drift
only. Output: a short digest, max 15 lines. Use at most 5k output tokens.
Take no write actions.
```

## Tier 3 — Cloud Routines (Anthropic-hosted, laptop can be off)

Created at claude.ai/code/routines (GitHub triggers are web-only; `/schedule`
in the CLI creates schedule triggers). All routines push only to `claude/`
branches (default — keep it).

### 3a. PR first-pass review — trigger: GitHub event, pull request opened

```
A pull request was opened against JBratzi/pocketshelf. Read the diff. Leave
ONE review comment covering: correctness bugs (especially in src-tauri/src/rom/
binary parsing — offsets, bounds checks, panics reachable from malformed ROM
files), TS/Rust serde casing mismatches, and style only when it obscures
meaning. Be specific (file:line). If the diff is clean, say so in one
sentence. Never request changes — comment only; a human makes the call.
```

### 3b. CI failure investigator — trigger: GitHub event, workflow run completed (conclusion: failure)

```
A CI run failed on JBratzi/pocketshelf. Read the failed job logs, identify
the root cause, and open a DRAFT pull request from a claude/fix-* branch
with the minimal fix and a body explaining cause and fix. If the failure is
infra/flake (runner, network), comment on the commit instead of opening a PR.
```

### 3c. Weekly drift check — trigger: schedule, Mondays 08:00

```
In JBratzi/pocketshelf: (1) compare README.md and docs/architecture.md
against the actual code — flag drift (commands renamed, structs changed,
features added but undocumented); (2) check npm and cargo dependencies for
major updates with security relevance. If anything found, open ONE draft PR
from claude/weekly-drift with the doc fixes and a summary of dependency
findings. If nothing found, do nothing (no empty PRs).
```

## Why these and not more

Automation earns its keep by output, not by existing. Three triggers cover
the repo's actual failure modes: PRs from strangers (3a), red CI (Tier 1
during dev, 3b after), and slow rot (3c). Anything beyond this is automation
theater.
