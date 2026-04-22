# Cache-Bust Fix: Force Railway Rebuild

## Problem

Railway is still deploying an old Docker image that contains the error:
```
The executable `node_env=production` could not be found.
```

This error was already fixed in PR #10 (Safe-Boot Procedure), but Railway hasn't picked up the new build.

## Root Cause

**Docker Layer Caching:** Railway has cached the old Docker layers. The Dockerfile CMD is correct on GitHub, but Railway is using a cached image from before the fix.

## Solution

**Add a cache-bust comment** to the Dockerfile with a timestamp. This invalidates Docker's layer cache and forces a complete rebuild.

### Change

**File:** `Dockerfile`

**Before:**
```dockerfile
# Start-Befehl: Starte Server direkt (nutze ENV Variable NODE_ENV)
# Safe-Boot: Keine Migrations beim Start, nur direkter Server-Start
CMD ["node", "dist/index.js", "--port=3000"]
```

**After:**
```dockerfile
# Start-Befehl: Starte Server direkt (nutze ENV Variable NODE_ENV)
# Safe-Boot: Keine Migrations beim Start, nur direkter Server-Start
# Cache-Bust: Force rebuild (2026-04-22T08:15:00Z)
CMD ["node", "dist/index.js", "--port=3000"]
```

## Why This Works

- Docker layer cache is invalidated when file content changes
- Timestamp comment is unique, forces rebuild
- Railway will build a fresh image
- New image will have correct CMD: `node dist/index.js --port=3000`
- Container will start without "node_env=production" error

## Expected Result

✅ Railway detects new commit
✅ Docker builds fresh image (no cache)
✅ Container starts with correct CMD
✅ Error "The executable `node_env=production` could not be found" is gone
✅ Application starts successfully

## Testing

After merge:
1. Check Railway deployment logs
2. Verify build completes successfully
3. Verify container starts without errors
4. Verify application is accessible

## Prevention

For future deployments:
- Always invalidate Docker cache when fixing critical issues
- Use timestamp comments in Dockerfile for cache-busting
- Monitor Railway logs for old image usage
- Force rebuild if needed: `git commit --allow-empty -m "chore: force rebuild"`
