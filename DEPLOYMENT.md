# Deployment Guide - trust.thehudsonfam.com

This guide covers deploying Trust Admin to Railway with Cloudflare DNS.

## Architecture

- **Domain**: trust.thehudsonfam.com
- **Platform**: Railway (Bun + PostgreSQL)
- **Database**: Neon (serverless PostgreSQL)
- **DNS**: Cloudflare
- **Stack**: React 19 + Vite + Bun + Drizzle ORM

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **Neon Database**: Your existing Neon database
3. **Cloudflare Account**: Access to thehudsonfam.com DNS settings
4. **GitHub**: Repository connected to Railway

---

## Step 1: Deploy to Railway

### 1.1 Create New Project

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose `hudsor01/trust-admin` repository
5. Select the `main` branch (or your deployment branch)

### 1.2 Configure Environment Variables

In Railway dashboard, go to **Variables** tab and add:

```bash
# Required
DATABASE_URL=<your-neon-connection-string>
BETTER_AUTH_SECRET=<generate-with-openssl-rand-base64-32>
NODE_ENV=production

# URLs
FRONTEND_URL=https://trust.thehudsonfam.com
API_URL=https://trust.thehudsonfam.com
TRUSTED_ORIGINS=https://trust.thehudsonfam.com
ALLOWED_ORIGINS=https://trust.thehudsonfam.com

# Email (Resend API)
RESEND_API_KEY=<your-resend-api-key>
EMAIL_FROM=Trust Admin <admin@thehudsonfam.com>

# Optional Monitoring
SENTRY_DSN=<your-sentry-dsn>
VITE_SENTRY_DSN=<your-frontend-sentry-dsn>
LOG_LEVEL=info
```

**Generate secrets:**
```bash
# Generate BETTER_AUTH_SECRET
openssl rand -base64 32
```

### 1.3 Configure Build Settings

Railway will auto-detect `railway.json`, but verify:

- **Build Command**: `bun install --frozen-lockfile && bun run build`
- **Start Command**: `NODE_ENV=production bun run start`
- **Port**: Railway auto-assigns (defaults to 8080 in code)

### 1.4 Deploy

Click **Deploy** in Railway dashboard. The build will:
1. Install dependencies with Bun
2. Build frontend with Vite → `dist/`
3. Start Bun server serving API + static files

---

## Step 2: Configure Cloudflare DNS

### 2.1 Get Railway Domain

After deployment, Railway assigns a URL like: `trust-admin-production-xyz.up.railway.app`

Copy this URL (without `https://`).

### 2.2 Add DNS Record in Cloudflare

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select `thehudsonfam.com` domain
3. Go to **DNS > Records**
4. Click **Add record**

**Configure CNAME:**
```
Type: CNAME
Name: trust
Target: trust-admin-production-xyz.up.railway.app
Proxy status: Proxied (orange cloud ON)
TTL: Auto
```

Click **Save**.

### 2.3 Add Custom Domain in Railway

1. In Railway project, go to **Settings** tab
2. Scroll to **Domains**
3. Click **Add Custom Domain**
4. Enter: `trust.thehudsonfam.com`
5. Railway will verify DNS and provision SSL certificate

Wait 5-10 minutes for DNS propagation and SSL setup.

---

## Step 3: Configure Neon Database

### 3.1 Get Connection String

1. Go to [Neon Console](https://console.neon.tech)
2. Select your project
3. Go to **Connection Details**
4. Copy the **connection string** with pooling:
   ```
   postgres://user:pass@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

### 3.2 Update Railway Environment

Paste the Neon connection string as `DATABASE_URL` in Railway variables.

### 3.3 Push Database Schema

After deployment, Railway will run `bun run db:push` automatically via the build command (you can add it if not already there).

Or manually trigger from Railway dashboard:
```bash
# In Railway Shell
bun run db:push
```

---

## Step 4: Verify Deployment

### 4.1 Health Check

Visit: `https://trust.thehudsonfam.com/health`

Expected response:
```json
{
  "status": "ok",
  "service": "trust-admin",
  "timestamp": "2024-01-13T...",
  "database": {
    "connected": true,
    "poolSize": 1
  }
}
```

### 4.2 Test Frontend

Visit: `https://trust.thehudsonfam.com`

You should see the Trust Admin dashboard.

### 4.3 Test API

```bash
curl https://trust.thehudsonfam.com/api/entities
```

Should return entities or empty array.

---

## Step 5: Enable GitHub Auto-Deploy

Railway automatically redeploys on every push to `main` branch.

To deploy a different branch:
1. Go to Railway **Settings** → **Service**
2. Change **Source** → **Branch** to your deployment branch
3. Save

---

## Maintenance

### View Logs

Railway dashboard → **Deployments** → **View Logs**

### Restart Service

Railway dashboard → **...** menu → **Restart**

### Update Environment Variables

Railway dashboard → **Variables** → Edit → **Redeploy**

### Database Migrations

```bash
# Via Railway shell
bun run db:push          # Development: sync schema
bun run db:generate      # Generate migration SQL
bun run db:migrate       # Production: apply migrations
```

### Rollback Deployment

Railway dashboard → **Deployments** → Select previous deployment → **Redeploy**

---

## Troubleshooting

### 502 Bad Gateway

- **Check logs** in Railway dashboard
- **Verify** DATABASE_URL is set correctly
- **Restart** the service

### Static Assets Not Loading

- **Verify** `bun run build` completed successfully in build logs
- **Check** `dist/` folder exists in deployment
- **Review** Railway build command includes `bun run build`

### Database Connection Errors

- **Test connection** from Railway shell: `bun -e "import { db } from './db'; console.log(await db.query.entity.findMany())"`
- **Verify** Neon database is accessible (not paused)
- **Check** DATABASE_URL includes `?sslmode=require`

### CORS Errors

- **Verify** `ALLOWED_ORIGINS` and `TRUSTED_ORIGINS` include your domain
- **Check** Cloudflare proxy settings (orange cloud = proxied, gray = DNS only)

---

## Security Checklist

- ✅ BETTER_AUTH_SECRET is strong (32+ random characters)
- ✅ DATABASE_URL is stored as environment variable (never committed)
- ✅ RESEND_API_KEY is kept secret
- ✅ ALLOWED_ORIGINS only includes trusted domains
- ✅ Cloudflare proxy is enabled (SSL/TLS, DDoS protection)
- ✅ Neon database uses connection pooling
- ✅ Sentry DSN configured for error monitoring

---

## Cost Estimates

**Railway** (Hobby Plan):
- $5/month base (500 hours included)
- Additional usage: ~$0.000231/minute
- ~$7-10/month for light usage

**Neon** (Free Tier):
- Free up to 0.5GB storage
- 100 hours compute/month
- Auto-suspends after inactivity
- Upgrade to Pro: $19/month for production workloads

**Cloudflare** (Free Tier):
- DNS + SSL: Free
- DDoS protection: Free
- Analytics: Free

**Total**: ~$5-10/month for hobby usage, ~$25-30/month for production

---

## Next Steps

1. ✅ Deploy to Railway
2. ✅ Configure DNS in Cloudflare
3. ⏳ Set up monitoring (Sentry)
4. ⏳ Configure backups (Neon automated backups)
5. ⏳ Set up staging environment (separate Railway project)

---

## Support

- **Railway Docs**: https://docs.railway.app
- **Neon Docs**: https://neon.tech/docs
- **Cloudflare Docs**: https://developers.cloudflare.com
- **Project Issues**: https://github.com/hudsor01/trust-admin/issues
