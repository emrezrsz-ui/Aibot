# Deployment Guide - Crypto Signal Dashboard

## GitHub Actions Setup (Manual)

Due to GitHub App permission restrictions, the CI/CD workflow must be created manually in your GitHub repository.

### Step 1: Create the Workflow File

1. Go to your GitHub repository: https://github.com/emrezrsz-ui/crypto-signal-dashboard
2. Click **"Add file"** → **"Create new file"**
3. Enter the path: `.github/workflows/deploy.yml`
4. Paste the following content:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build
        run: pnpm run build
      
      - name: Run tests
        run: pnpm run test
      
      - name: Success
        run: echo "✅ Build successful - Railway will deploy automatically"
```

5. Click **"Commit changes"** with message: `ci: Add GitHub Actions deployment workflow`
6. Commit directly to the `main` branch

### Step 2: Verify GitHub Actions

1. Go to the **"Actions"** tab in your GitHub repository
2. You should see the workflow running
3. Wait for it to complete (should take 2-3 minutes)
4. Confirm you see a ✅ green checkmark

### Step 3: Railway Deployment

Once GitHub Actions shows ✅:
1. Railway will automatically detect the push to `main`
2. Railway will pull the latest code
3. Railway will run `pnpm db:push` to apply Drizzle migrations
4. Your app will be deployed automatically

### Step 4: Verify Deployment

1. Check your Railway dashboard for deployment status
2. Once deployed, test the Trading Hub in Demo Mode
3. Verify that signals are being detected and logged correctly

## Database Migrations

The project uses Drizzle ORM with the following tables:
- `users` - User authentication
- `scan_signals` - Trading signals from the scanner
- `trades` - Executed trades (Demo/Real)
- `user_connections` - Exchange API connections (Binance, MetaTrader)
- `trading_configs` - Bot settings and risk management
- `filter_configs` - Trading filter configurations

When Railway deploys, it automatically runs:
```bash
pnpm db:push
```

This will:
1. Generate migrations from the Drizzle schema
2. Apply any pending migrations to the database

## Troubleshooting

### GitHub Actions Fails
- Check the Actions tab for error details
- Ensure `pnpm` is available (it's pre-installed in the workflow)
- Verify all dependencies are in `package.json`

### Railway Deployment Fails
- Check Railway logs for database connection errors
- Ensure `DATABASE_URL` environment variable is set
- Verify the database has all required tables

### Database Column Errors
If you see errors like "Unknown column 'hasDivergence'":
1. This means the Drizzle migration hasn't been applied yet
2. Railway will apply it automatically on next deployment
3. Or manually run: `pnpm db:push` in your Railway environment

## Local Testing

Before pushing to GitHub, always verify locally:

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build
pnpm run build

# Check database migrations
pnpm db:push
```

All 122 tests should pass before pushing to GitHub.
