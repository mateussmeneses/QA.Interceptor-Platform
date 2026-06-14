# GitHub Project Bootstrap

Use this guide to initialize labels, milestones, and issues from the backlog.

## Suggested Milestones

1. Phase 1 - Browser Extension MVP
2. Phase 2 - Advanced Browser Features
3. Phase 3 - QA Platform Features

## Apply Labels

If GitHub CLI is available and authenticated:

```bash
gh label create "type:feature" --color "1d76db" --description "New feature implementation"
gh label create "type:tech-debt" --color "d4c5f9" --description "Refactoring and maintainability improvements"
gh label create "domain:extension" --color "0e8a16" --description "Browser extension scope"
gh label create "domain:rule-engine" --color "5319e7" --description "Rule engine scope"
gh label create "domain:ui" --color "fbca04" --description "UI and UX scope"
gh label create "priority:P0" --color "b60205" --description "Critical priority"
gh label create "priority:P1" --color "d93f0b" --description "High priority"
gh label create "priority:P2" --color "fbca04" --description "Medium priority"
gh label create "status:blocked" --color "000000" --description "Blocked by dependency"
gh label create "qa-workflow" --color "0052cc" --description "Direct QA workflow impact"
```

## Create Milestones

```bash
gh api repos/:owner/:repo/milestones -f title="Phase 1 - Browser Extension MVP"
gh api repos/:owner/:repo/milestones -f title="Phase 2 - Advanced Browser Features"
gh api repos/:owner/:repo/milestones -f title="Phase 3 - QA Platform Features"
```

## Create Initial Issues (MVP-001 to MVP-003)

```bash
gh issue create --title "MVP-001 Create extension shell" --body "Scaffold extension workspace and local build pipeline." --label "type:feature,domain:extension,priority:P0,qa-workflow"
gh issue create --title "MVP-002 Configure Manifest V3" --body "Define required permissions and entry points for extension runtime." --label "type:feature,domain:extension,priority:P0,qa-workflow"
gh issue create --title "MVP-003 Build Side Panel base UI" --body "Implement side panel shell and placeholder traffic list." --label "type:feature,domain:ui,priority:P0,qa-workflow"
```

Replace `:owner` and `:repo` before execution.
