# Summary 02-01: Enable Vercel Preview Branching

## Status: REQUIRES MANUAL CONFIGURATION

This phase requires console/UI configuration in Neon and Vercel that cannot be automated via code.

## Steps to Complete Manually

### 1. In Neon Console (console.neon.tech)

1. Go to your project → **Settings** → **Integrations**
2. Click **Add integration** → **Vercel**
3. Select **Neon-managed integration** (since you have existing Neon account)
4. Authorize the connection
5. Enable **"Create a branch for every preview deployment"**
6. Set **Branch TTL**: 7 days (branches auto-delete after this)

### 2. In Vercel Dashboard

1. Verify environment variables are set:
   - `DATABASE_URL` (will be auto-managed by integration)
   - `NEON_AUTH_BASE_URL` (set to production value)
   - All other required env vars

2. Deploy any PR to test the integration

### 3. Verify It Works

1. Create a test PR
2. Check Neon Console - new branch should appear under "Branches"
3. Check Vercel preview deployment logs - should show branch DATABASE_URL
4. Merge/close PR - branch should auto-delete

## Benefits

- **Safe PR testing**: Each PR gets isolated database copy
- **Schema migration testing**: Test db:deploy on preview branches first
- **No data corruption risk**: Production database stays untouched
- **Automatic cleanup**: Branches deleted when PRs close

## Documentation

- https://neon.com/docs/guides/vercel-overview
- https://neon.com/docs/introduction/branching
