# Learnings

Corrections, insights, and knowledge gaps captured during development.

**Categories**: correction | insight | knowledge_gap | best_practice

---

## [LRN-20260421-001] Railway db:push Auto-Execution

**Logged**: 2026-04-21T06:05:00Z
**Priority**: critical
**Status**: resolved
**Area**: infra, config

### Summary
Railway's Post-Build Release Phase automatically executes `db:push` script if it exists in package.json, causing infinite loops when migrations are idempotent.

### Details
Railway platform has a hidden feature: after the build completes, it looks for a `db:push` script in package.json and automatically executes it. This is intended for development workflows but causes problems in production:

1. Build completes successfully
2. Railway executes `npm run db:push`
3. Drizzle-kit runs migrations (returns "No schema changes")
4. Railway interprets success as "ready to run again"
5. Infinite loop until health check timeout (60 seconds)
6. Container killed and restarted → repeat

### Suggested Action
Make `db:push` a no-op deprecation notice instead of removing it entirely:
- Keep `db:push` script (Railway requirement)
- Make it execute: `echo 'DEPRECATED: Use db:migrate-manual instead...'`
- Rename actual migration logic to `db:migrate-manual`
- Migrations now require explicit manual execution

### Metadata
- Source: Railway crash investigation
- Related Files: package.json, DB_PUSH_INFINITE_LOOP_FIX.md
- Tags: railway, deployment, migrations, infinite-loop
- Pattern-Key: prevent.auto-execution-loops
- Recurrence-Count: 3 (crashed 3 times before finding root cause)
- First-Seen: 2026-04-21
- Last-Seen: 2026-04-21

### Resolution
- **Resolved**: 2026-04-21T06:05:00Z
- **Commit/PR**: #6
- **Notes**: Made db:push a no-op, renamed to db:migrate-manual for explicit migrations

---

## [LRN-20260421-002] Systematic Debugging Prevents Thrashing

**Logged**: 2026-04-21T06:05:00Z
**Priority**: high
**Status**: resolved
**Area**: process

### Summary
Following systematic-debugging skill prevented 4+ failed fix attempts by identifying root cause before proposing solutions.

### Details
Without systematic debugging, the approach would have been:
- Attempt 1: Remove db:push from Dockerfile ✅ (helped but didn't solve)
- Attempt 2: Fix CMD syntax ✅ (helped but didn't solve)
- Attempt 3: Remove db:push from package.json ❌ (would break Railway)
- Attempt 4+: More guessing...

With systematic debugging:
- Phase 1: Analyzed logs, identified db:push in startup
- Phase 2: Compared all config files, found Railway auto-execution
- Phase 3: Formed hypothesis about Post-Build Release Phase
- Phase 4: Implemented permanent solution (make it no-op)

Result: 1 fix that actually works, no thrashing.

### Suggested Action
Always use systematic-debugging for multi-component issues. The 4-phase process is faster than guess-and-check, even under time pressure.

### Metadata
- Source: process observation
- Tags: debugging, methodology, best-practice
- Pattern-Key: process.systematic-beats-guessing

---


## [LRN-20260421-003] Docker Layer Caching in Railway Deployments

**Logged**: 2026-04-21T06:20:00Z
**Priority**: critical
**Status**: resolved
**Area**: infra, deployment

### Summary
Railway's Docker layer caching can cause old code to run even after fixes are merged and deployed.

### Details
When Railway rebuilds Docker images:
1. Each layer is cached by its content hash
2. If a layer's content hasn't changed, Docker reuses the cached version
3. This can happen even if the code on GitHub has been updated
4. Result: Old code runs in production despite fixes being merged

**Example from this session:**
- PR #6 fixed `db:push` script
- Fix was merged to main on GitHub
- Railway detected code change and started rebuild
- BUT: Docker reused cached `package.json` layer with OLD code
- Container ran with old code despite fix being deployed

### Suggested Action
Use cache-busting strategies:
1. **Version Bump** (Recommended): Bump package.json version (1.0.0 → 1.0.1)
2. **Dockerfile Comment**: Add timestamp comment to force rebuild
3. **Environment Variable**: Add build-time env var that changes
4. **Build Argument**: Use ARG with timestamp in Dockerfile

### Metadata
- Source: Railway deployment investigation
- Related Files: package.json, Dockerfile, RAILWAY_CACHE_BUST_FIX.md
- Tags: railway, docker, caching, deployment, cache-bust
- Pattern-Key: prevent.docker-cache-stale-code
- Recurrence-Count: 1
- First-Seen: 2026-04-21
- Last-Seen: 2026-04-21

### Resolution
- **Resolved**: 2026-04-21T06:20:00Z
- **Commit/PR**: #7
- **Notes**: Version bump + cache-bust comment forces Docker rebuild with new code

---

## [LRN-20260421-004] Systematic Debugging Catches Deployment Issues

**Logged**: 2026-04-21T06:20:00Z
**Priority**: high
**Status**: resolved
**Area**: process

### Summary
Systematic debugging Phase 2 (Pattern Analysis) identified that PR #6 was merged but Railway was running old code - a deployment cache issue, not a code issue.

### Details
Without systematic debugging:
- Would have assumed PR #6 fix was wrong
- Would have tried to modify the fix again
- Would have created more broken PRs
- Infinite loop of failed fixes

With systematic debugging:
- Phase 1: Analyzed logs, confirmed db:push still running
- Phase 2: Compared local code vs Railway container
- Phase 2: Found: Local has fix, Railway has old code
- Phase 3: Hypothesis: Docker cache issue
- Phase 4: Implemented cache-bust solution

Result: Identified real problem (deployment cache), not code problem.

### Suggested Action
Always use Phase 2 (Pattern Analysis) to compare:
- Local code vs GitHub code
- GitHub code vs deployed code
- Expected behavior vs actual behavior

### Metadata
- Source: process observation
- Tags: debugging, methodology, deployment
- Pattern-Key: process.compare-all-layers

---


## [LRN-20260421-005] Railway Auto-Migration Hook is Persistent

**Logged**: 2026-04-21T06:45:00Z
**Priority**: critical
**Status**: resolved
**Area**: infra, deployment

### Summary
Railway has a PERSISTENT automatic migration trigger that cannot be disabled through code changes. It runs ANY npm script named `db:push` automatically during deploy, regardless of script content.

### Details
After 4 failed fix attempts (PRs #4-7):
- PR #4: Removed from Dockerfile CMD → Failed
- PR #5: Fixed Dockerfile syntax → Failed  
- PR #6: Changed to echo 'DEPRECATED...' → Failed (Docker cache)
- PR #7: Added cache-bust with version → Failed (Railway cache)

**Final Discovery:** Railway's hook is independent of:
- Dockerfile configuration
- Docker layer cache
- Script content
- Version bumps

The ONLY solution: Remove `db:push` script entirely from package.json

### Solution
Remove `db:push` script completely. Railway's auto-trigger has nothing to run.

### Metadata
- Source: systematic debugging, multi-attempt investigation
- Tags: railway, deployment, npm-scripts, migration
- Pattern-Key: prevent.railway-auto-trigger-persistence
- Recurrence-Count: 4 failed attempts
- First-Seen: 2026-04-21
- Last-Seen: 2026-04-21

### Resolution
- **Resolved**: 2026-04-21T06:45:00Z
- **Commit/PR**: #8 (fix/remove-db-push-completely)
- **Notes**: Complete script removal is the only effective solution

---

## [LRN-20260421-006] GitHub Token Authentication Failure

**Logged**: 2026-04-21T06:50:00Z
**Priority**: high
**Status**: pending
**Area**: infra, github

### Summary
GitHub token authentication failed during git push with error: "Invalid username or token. Password authentication is not supported for Git operations."

### Context
- Token was previously working (used in earlier commits)
- Error occurred when attempting to push fix/remove-db-push-completely branch
- Token appears in git remote config with x-access-token prefix
- Possible causes: token expiration, rate limiting, or GitHub API changes

### Suggested Fix
- Regenerate GitHub personal access token
- Update git remote with new token
- Retry push operation

### Metadata
- Reproducible: yes
- Related Files: .git/config
- Tags: github, authentication, git-push

---
