# Production Deployment Guide

**Application:** Trust Admin  
**Runtime:** Bun  
**Framework:** React + Vite  
**Database:** PostgreSQL  
**Deployment Targets:** Railway, Render, Fly.io

---

## Prerequisites

Before deploying Trust Admin to production, ensure you have:

### Required Accounts
- [ ] **Railway**/Render/Fly.io account (choose one)
- [ ] **Sentry account** (recommended for error tracking)
- [ ] **Resend account** (optional, for magic link emails)
- [ ] **Domain name** (optional but recommended)

### Required Tools
- [ ] Git repository with Trust Admin codebase
- [ ] Platform CLI (optional, for command-line deployment)
- [ ] OpenSSL (for generating secrets)

### Environment Preparation
- [ ] PostgreSQL database ready (or will be created during deployment)
- [ ] SSL certificate for domain (auto-provided by platforms)
- [ ] BETTER_AUTH_SECRET generated (see below)

**Generate BETTER_AUTH_SECRET:**
```bash
openssl rand -base64 32
```

---

## Deployment Options

Choose one of the following deployment platforms. All three support Bun natively.

---

## Option 1: Railway (Recommended)

**Pros:** Simplest setup, automatic Postgres, built-in domains  
**Cons:** $5/month minimum for hobby plan  
**Best for:** Quick deployment, staging environments

### Step 1: Create Project

**Via Web Dashboard:**
1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your Trust Admin repository

**Via CLI:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create project
railway init

# Link to existing project (if applicable)
railway link [project-id]
```

### Step 2: Add PostgreSQL Database

**Via Web Dashboard:**
1. In your project, click "New"
2. Select "Database" → "PostgreSQL"
3. Railway will create database and set `DATABASE_URL` automatically

**Via CLI:**
```bash
railway add postgresql
```

Railway automatically injects `DATABASE_URL` into your environment.

### Step 3: Configure Environment Variables

**Via Web Dashboard:**
1. Go to project → "Variables"
2. Add each variable from the list below

**Via CLI:**
```bash
railway variables set BETTER_AUTH_SECRET=$(openssl rand -base64 32)
railway variables set NODE_ENV=production
railway variables set FRONTEND_URL=https://your-app.up.railway.app
railway variables set API_URL=https://your-app.up.railway.app
railway variables set TRUSTED_ORIGINS=https://your-app.up.railway.app
railway variables set ALLOWED_ORIGINS=https://your-app.up.railway.app

# Optional: Email & Monitoring
railway variables set RESEND_API_KEY=re_your_key_here
railway variables set EMAIL_FROM="Trust Admin <noreply@yourdomain.com>"
railway variables set SENTRY_DSN=https://your-dsn@sentry.io/project
railway variables set VITE_SENTRY_DSN=https://your-dsn@sentry.io/project
```

### Step 4: Deploy

**Via Web Dashboard:**
- Automatic deployment on git push to main branch

**Via CLI:**
```bash
railway up
```

### Step 5: Custom Domain (Optional)

**Via Web Dashboard:**
1. Go to project → "Settings" → "Domains"
2. Click "Add Domain"
3. Enter your domain name
4. Follow DNS configuration instructions

**Update environment variables with custom domain:**
```bash
railway variables set FRONTEND_URL=https://yourdomain.com
railway variables set API_URL=https://yourdomain.com
railway variables set TRUSTED_ORIGINS=https://yourdomain.com
railway variables set ALLOWED_ORIGINS=https://yourdomain.com
```

---

## Option 2: Render

**Pros:** Free tier available, good docs  
**Cons:** Cold starts on free tier  
**Best for:** Personal projects, free tier testing

### Step 1: Create PostgreSQL Database

1. Go to https://dashboard.render.com
2. Click "New" → "PostgreSQL"
3. Fill in database details:
   - **Name:** trust-admin-db
   - **Region:** Choose closest to users
   - **PostgreSQL Version:** 15 or higher
4. Click "Create Database"
5. Copy the **Internal Database URL** (for your web service)

### Step 2: Create Web Service

1. Click "New" → "Web Service"
2. Connect your GitHub repository
3. Configure service:
   - **Name:** trust-admin
   - **Region:** Same as database
   - **Branch:** main
   - **Build Command:** `bun install`
   - **Start Command:** `bun run index.ts`

### Step 3: Environment Variables

In the "Environment" section, add:

```bash
DATABASE_URL=<internal-database-url-from-step-1>
NODE_ENV=production
PORT=5050
BETTER_AUTH_SECRET=<generate-with-openssl>

# URLs (update after deploy when you have the Render URL)
FRONTEND_URL=https://trust-admin.onrender.com
API_URL=https://trust-admin.onrender.com
TRUSTED_ORIGINS=https://trust-admin.onrender.com
ALLOWED_ORIGINS=https://trust-admin.onrender.com

# Optional: Monitoring & Email
RESEND_API_KEY=re_your_key_here
EMAIL_FROM="Trust Admin <noreply@yourdomain.com>"
SENTRY_DSN=https://your-dsn@sentry.io/project
VITE_SENTRY_DSN=https://your-dsn@sentry.io/project
```

### Step 4: Deploy

1. Click "Create Web Service"
2. Render will build and deploy automatically
3. Monitor deployment logs for errors

### Step 5: Post-Deployment

1. Visit the provided Render URL (e.g., `trust-admin.onrender.com`)
2. Test authentication with magic link
3. Verify database connection

### Step 6: Custom Domain (Optional)

1. Go to service → "Settings" → "Custom Domains"
2. Click "Add Custom Domain"
3. Enter your domain
4. Configure DNS (Render provides instructions)
5. Update environment variables with custom domain

---

## Option 3: Fly.io

**Pros:** Global edge deployment, fast performance  
**Cons:** More complex setup, command-line focused  
**Best for:** Production apps, global users

### Step 1: Install Fly CLI

**macOS/Linux:**
```bash
curl -L https://fly.io/install.sh | sh
```

**Windows (PowerShell):**
```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

**Verify installation:**
```bash
fly version
```

### Step 2: Login & Create App

```bash
# Login to Fly.io
fly auth login

# Create app (launches interactive setup)
fly launch

# When prompted:
# - App name: trust-admin (or custom)
# - Region: Choose closest to users
# - PostgreSQL: YES (choose development or production tier)
# - Deploy now: NO (configure environment first)
```

This creates `fly.toml` configuration file.

### Step 3: Configure Postgres

If you said YES to PostgreSQL in launch:
```bash
# Attach database to app
fly postgres attach <postgres-app-name>
```

This automatically sets `DATABASE_URL`.

Or create PostgreSQL separately:
```bash
# Create database
fly postgres create --name trust-admin-db

# Attach to app
fly postgres attach trust-admin-db
```

### Step 4: Set Environment Variables

```bash
# Required
fly secrets set BETTER_AUTH_SECRET=$(openssl rand -base64 32)
fly secrets set NODE_ENV=production

# URLs (update <app-name> with your Fly app name)
fly secrets set FRONTEND_URL=https://<app-name>.fly.dev
fly secrets set API_URL=https://<app-name>.fly.dev
fly secrets set TRUSTED_ORIGINS=https://<app-name>.fly.dev
fly secrets set ALLOWED_ORIGINS=https://<app-name>.fly.dev

# Optional: Email & Monitoring
fly secrets set RESEND_API_KEY=re_your_key_here
fly secrets set EMAIL_FROM="Trust Admin <noreply@yourdomain.com>"
fly secrets set SENTRY_DSN=https://your-dsn@sentry.io/project
fly secrets set VITE_SENTRY_DSN=https://your-dsn@sentry.io/project
```

### Step 5: Deploy

```bash
# Deploy to Fly.io
fly deploy
```

Monitor deployment:
```bash
fly logs
```

### Step 6: Custom Domain (Optional)

```bash
# Add certificate for custom domain
fly certs add yourdomain.com

# Follow DNS instructions provided
```

Update environment variables:
```bash
fly secrets set FRONTEND_URL=https://yourdomain.com
fly secrets set API_URL=https://yourdomain.com
fly secrets set TRUSTED_ORIGINS=https://yourdomain.com
fly secrets set ALLOWED_ORIGINS=https://yourdomain.com
```

---

## Environment Variables Reference

### Required for All Platforms

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `NODE_ENV` | Environment mode | `production` |
| `BETTER_AUTH_SECRET` | Session encryption key (32+ chars) | `$(openssl rand -base64 32)` |
| `FRONTEND_URL` | Frontend application URL | `https://yourdomain.com` |
| `API_URL` | Backend API URL | `https://yourdomain.com` |
| `TRUSTED_ORIGINS` | Comma-separated allowed origins for auth | `https://yourdomain.com` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `https://yourdomain.com` |

### Optional

| Variable | Description | Example |
|----------|-------------|---------|
| `RESEND_API_KEY` | Resend API key for magic link emails | `re_123abc...` |
| `EMAIL_FROM` | Email sender address | `Trust Admin <admin@domain.com>` |
| `SENTRY_DSN` | Backend error reporting | `https://...@sentry.io/123` |
| `VITE_SENTRY_DSN` | Frontend error reporting | `https://...@sentry.io/123` |
| `PORT` | Server port (default: 5050) | `5050` |
| `LOG_LEVEL` | Logging verbosity | `info` |

---

## Database Migrations

### Initial Deployment

On first deploy, sync the database schema:

```bash
bun run db:push
```

This creates all tables and relationships defined in `db/schema.ts`.

### Subsequent Updates

When schema changes are made:

**Development workflow:**
```bash
# Make changes to db/schema.ts
bun run db:push  # Sync changes to database
```

**Production workflow (recommended):**
```bash
# Generate migration SQL
bunx drizzle-kit generate

# Review generated migration in drizzle/ directory
# Apply migration
bunx drizzle-kit migrate
```

### Seeding Data (Optional)

```bash
bun run db:seed
```

This loads Hudson Trust sample data (useful for testing).

---

## Post-Deployment Checklist

After deploying, verify:

### Application Health

- [ ] **Homepage loads:** Visit frontend URL, see login page
- [ ] **Health check:** `curl https://yourapp.com/health` returns 200 OK
- [ ] **No console errors:** Check browser dev tools (F12)
- [ ] **API connectivity:** Test creating/reading entities

### Authentication

- [ ] **Magic link request:** Submit email, no 500 errors
- [ ] **Email delivery:** Receive magic link email (if Resend configured)
- [ ] **Login flow:** Click magic link, redirected to dashboard
- [ ] **Session persistence:** Refresh page, still logged in
- [ ] **Logout:** Sign out, redirected to login

### Database

- [ ] **Tables created:** Check Drizzle Studio or direct SQL
- [ ] **Connections:** Monitor database connection pool
- [ ] **Backups:** Configure automatic backups on platform

### Security

- [ ] **HTTPS enforced:** All requests use HTTPS
- [ ] **CORS working:** Frontend can call API without errors
- [ ] **Environment variables set:** All required vars configured
- [ ] **Authentication enabled:** Cannot access admin without login
- [ ] **Sessions secure:** httpOnly, secure cookies set

### Monitoring

- [ ] **Sentry receiving errors:** Trigger test error, appears in Sentry
- [ ] **Logs accessible:** Can view application logs on platform
- [ ] **Performance:** Page load times < 2s
- [ ] **Uptime monitoring:** Configure UptimeRobot or similar

### Domain & SSL

- [ ] **Custom domain configured:** (if using)
- [ ] **SSL certificate valid:** Green lock icon in browser
- [ ] **HSTS enabled:** (recommended for production)

---

## Monitoring & Maintenance

### Application Logs

**Railway:**
```bash
railway logs
```

**Render:**
- Dashboard → Service → "Logs" tab

**Fly.io:**
```bash
fly logs
fly logs -a <app-name> --follow
```

### Database Maintenance

**Cleanup expired sessions:**
```sql
DELETE FROM session WHERE "expires_at" < NOW();
```

**Monitor table sizes:**
```sql
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Backups

**Railway:** Automatic daily backups on paid plans  
**Render:** Configure backup schedule in database settings  
**Fly.io:** Use `fly postgres backup` commands

**Manual backup:**
```bash
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

---

## Troubleshooting

### "Environment validation failed"

**Symptom:** Server fails to start with validation errors

**Solution:**
1. Check server logs for specific missing variables
2. Verify all required environment variables are set
3. Ensure no typos in variable names
4. Re-deploy after adding missing variables

### "Email service not configured"

**Symptom:** Magic link returns 500 error

**Solution:**
- Add `RESEND_API_KEY` environment variable
- Get API key from https://resend.com/api-keys
- Redeploy application

**Workaround (development):**
- Magic links still work with email service disabled
- Check server logs for the magic link URL
- Manually visit the URL to authenticate

### "CORS policy blocked"

**Symptom:** API requests fail with CORS error in browser console

**Solution:**
1. Verify `ALLOWED_ORIGINS` includes your frontend URL
2. Ensure both URLs use same protocol (both HTTPS)
3. Check for trailing slashes (should match exactly)
4. Redeploy after updating variables

### "Session not persisting"

**Symptom:** Logged out after page refresh

**Solution:**
1. Verify `BETTER_AUTH_SECRET` is set (32+ characters)
2. Check cookies are being set (browser dev tools → Application → Cookies)
3. Ensure `secure` cookie can be set (requires HTTPS)
4. Verify `TRUSTED_ORIGINS` includes your domain

### "Database connection failed"

**Symptom:** 500 errors, database queries failing

**Solution:**
1. Verify `DATABASE_URL` is set correctly
2. Check database is running (platform dashboard)
3. Verify network connectivity (firewall, VPC)
4. Check connection pool limits
5. Review database logs for connection errors

### "Build failed"

**Symptom:** Deployment fails during build step

**Solution:**
1. Check build logs for specific errors
2. Verify `bun install` runs locally
3. Ensure all dependencies in `package.json`
4. Check Bun version compatibility
5. Clear build cache and retry

### "Port already in use"

**Symptom:** Server fails to start with EADDRINUSE error

**Solution:**
- Platforms automatically assign PORT
- Do NOT hardcode port 5050 in production
- Use `process.env.PORT || 5050` (already configured)

---

## Scaling Considerations

### Database

**When to scale:**
- Query times > 100ms
- Connection pool exhausted
- Table sizes > 10GB

**How to scale:**
- **Railway:** Upgrade database plan
- **Render:** Upgrade to larger instance
- **Fly.io:** Vertical scaling (more RAM/CPU)

### Application

**When to scale:**
- Response times > 500ms
- CPU/memory consistently > 80%
- High concurrent users

**How to scale:**
- **Railway:** Horizontal scaling (multiple replicas)
- **Render:** Increase instance size or add workers
- **Fly.io:** `fly scale count 3` (multiple machines)

### CDN (Optional)

For static assets, consider Cloudflare CDN:
1. Point domain DNS to Cloudflare
2. Enable "Proxy" mode (orange cloud)
3. Configure caching rules
4. Benefit: Reduced server load, faster asset delivery

---

## Cost Estimates (as of 2026-01)

### Railway
- **Hobby:** $5/month (500MB RAM, 100GB bandwidth)
- **PostgreSQL:** Included in hobby plan
- **Total:** ~$5-10/month

### Render
- **Web Service:** Free tier or $7/month (512MB RAM)
- **PostgreSQL:** Free tier or $7/month
- **Total:** ~$0-14/month

### Fly.io
- **App:** $5/month (256MB RAM)
- **PostgreSQL:** $5-15/month (depending on tier)
- **Total:** ~$10-20/month

**Additional costs:**
- **Sentry:** Free tier (5K errors/month)
- **Resend:** Free tier (100 emails/day)
- **Domain:** ~$10-20/year

---

## Security Best Practices

### Before Going Live

- [ ] Change all default secrets/passwords
- [ ] Enable HTTPS everywhere (no HTTP)
- [ ] Configure firewall rules (database access)
- [ ] Set up monitoring alerts
- [ ] Review session security (docs/SESSION-SECURITY.md)
- [ ] Test magic link authentication end-to-end
- [ ] Verify CORS configuration
- [ ] Enable Sentry error tracking
- [ ] Configure database backups
- [ ] Document admin credentials securely

### Ongoing

- [ ] Review Sentry errors weekly
- [ ] Monitor database size and performance
- [ ] Update dependencies monthly (`bun update`)
- [ ] Review access logs for anomalies
- [ ] Rotate BETTER_AUTH_SECRET quarterly (optional)
- [ ] Test disaster recovery procedures

---

## Support Resources

### Platform Documentation
- **Railway:** https://docs.railway.app
- **Render:** https://render.com/docs
- **Fly.io:** https://fly.io/docs

### Application Resources
- **Trust Admin GitHub:** (your repository)
- **Better Auth:** https://www.better-auth.com/docs
- **Drizzle ORM:** https://orm.drizzle.team/docs
- **Bun:** https://bun.sh/docs

### Community
- **Railway Discord:** https://discord.gg/railway
- **Render Community:** https://community.render.com
- **Fly.io Community:** https://community.fly.io

---

## Conclusion

Trust Admin is now production-ready with comprehensive deployment guides for three major platforms. Choose the platform that best fits your needs:

- **Railway:** Fastest setup, best for quick deployments
- **Render:** Free tier option, good for personal projects
- **Fly.io:** Best performance, ideal for production apps

All platforms support:
- ✅ Bun runtime
- ✅ PostgreSQL databases
- ✅ Automatic HTTPS/SSL
- ✅ Environment variables
- ✅ Custom domains
- ✅ Horizontal scaling

Follow the post-deployment checklist to ensure everything is working correctly, and refer to the troubleshooting section if you encounter issues.

**Next Steps:**
1. Choose deployment platform
2. Follow platform-specific guide above
3. Complete post-deployment checklist
4. Configure monitoring (Sentry)
5. Test authentication flow
6. Set up backups
7. Monitor application health

**Last Updated:** 2026-01-09
