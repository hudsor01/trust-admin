# Summary 04-01: Add pg_cron Scheduled Jobs

## Status: REQUIRES MANUAL CONFIGURATION + CONSIDERATION

pg_cron requires compute to be always-on (no scale-to-zero), which increases costs.

## Decision Required

**Question:** Is the cost of always-on compute worth the automation benefits?

**Estimated cost increase:** ~$19/month minimum (0.25 CU always running)

**Alternative:** Use external cron (GitHub Actions, Vercel cron) for scheduled tasks

## If You Decide to Enable pg_cron

### Step 1: Enable via Neon API

```bash
curl -X PATCH \
  "https://console.neon.tech/api/v2/projects/{project_id}/endpoints/{endpoint_id}" \
  -H "Authorization: Bearer $NEON_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"endpoint": {"settings": {"pg_settings": {"cron.database_name": "neondb"}}}}'
```

### Step 2: Restart Compute

Restart via Neon Console or wait for idle restart.

### Step 3: Create Extension

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### Step 4: Disable Scale-to-Zero

In Neon Console → Compute → Edit → Set "Suspend compute after period of inactivity" to "Never"

### Step 5: Schedule Jobs

```sql
-- Archive activity logs older than 90 days (daily at 2am UTC)
SELECT cron.schedule('archive-activity-log', '0 2 * * *',
  $$DELETE FROM activity_log WHERE created_at < NOW() - INTERVAL '90 days'$$);

-- Cleanup cron job history (weekly on Sunday at 3am UTC)
SELECT cron.schedule('cleanup-cron-history', '0 3 * * 0',
  $$DELETE FROM cron.job_run_details WHERE end_time < NOW() - INTERVAL '7 days'$$);
```

### Step 6: Monitor Jobs

```sql
SELECT * FROM cron.job;
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

## Alternative: GitHub Actions Cron

If always-on compute is not worth it, use GitHub Actions:

```yaml
# .github/workflows/maintenance.yml
name: Database Maintenance
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2am UTC
jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun run db:maintenance
```

Then create a script that connects and runs cleanup queries.

## Recommendation

For a low-traffic trust admin app, **skip pg_cron** and use GitHub Actions if automated cleanup is needed. The cost of always-on compute likely exceeds the benefit.
