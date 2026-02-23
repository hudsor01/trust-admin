# Summary 06-01: Optimize Autoscaling Configuration

## Status: REQUIRES MONITORING + MANUAL CONFIGURATION

Autoscaling optimization requires observing actual usage patterns first.

## Current Defaults (Scale Plan)

- **Min CU:** 0.25 (1 GB RAM)
- **Max CU:** 8 (32 GB RAM)
- **Scale to zero:** Enabled (suspends after 5 min inactivity)

## Recommended Approach

### Step 1: Monitor for 2 Weeks

1. Go to Neon Console → your project
2. Check the "Monitoring" tab daily
3. Note:
   - Peak CU usage (blue line)
   - RAM usage patterns (green line)
   - Scale-to-zero triggers

### Step 2: Adjust Based on Patterns

**If CU regularly hits max:**
- Increase max CU setting

**If RAM usage is consistently low:**
- Keep min CU at 0.25

**If you see slow cold starts:**
- Increase min CU to keep more resources ready

**If compute rarely scales to zero:**
- Consider smaller suspend timeout

### Step 3: Configure in Neon Console

1. Go to Branches → main → Computes
2. Click Edit on your compute
3. Adjust min/max CU sliders
4. Set suspend timeout as needed

## Optional: Install neon_utils for CPU Monitoring

```sql
CREATE EXTENSION IF NOT EXISTS neon_utils;

-- Get current CPU utilization
SELECT * FROM neon_utils.get_utilization();
```

## Recommendations for Trust Admin

Given this is a low-traffic trust administration app:

| Setting | Recommended | Rationale |
|---------|-------------|-----------|
| Min CU | 0.25 | Low traffic, cost efficiency |
| Max CU | 2 | Trust data isn't huge |
| Suspend | 5 min | Default is fine |

These can be adjusted after monitoring shows actual patterns.

## Cost Optimization

- **Scale to zero:** Keep enabled for cost savings
- **Avoid always-on:** Only disable if pg_cron is critical
- **Right-size max CU:** Don't pay for capacity you don't use
