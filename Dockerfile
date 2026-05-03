# syntax=docker/dockerfile:1.10
# Trust Admin — containerized build. Primary deploy target is Vercel;
# this image is for homelab / alternate hosts. Migrations run OUTSIDE
# this image (from CI or a dev machine) — drizzle-kit is a devDep and
# db/migrations/ is not copied into the runtime.

FROM --platform=linux/amd64 oven/bun:1 AS base

# Dependencies
FROM base AS deps
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Build — node:22-slim (glibc) in the runner stage matches the bun
# builder's libc so `sharp` native binaries load without rebuilds.
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Skip Zod env validation at build time — instrumentation.ts handles strict
# validation at server startup. Mirror of ci.yml's bun-run-build env block.
ENV SKIP_ENV_VALIDATION=1

# Neon Auth's @neondatabase/auth requires cookies.secret at module-init time
# (during next build's page-data collection — not just at request time), so
# next build fails without it. Mirror of ci.yml's NEON_AUTH_COOKIE_SECRET
# placeholder. No real cookies are signed at build time; runtime overrides
# via the ExternalSecret-injected NEON_AUTH_COOKIE_SECRET.
ENV NEON_AUTH_COOKIE_SECRET=ci-build-placeholder-not-used-for-real-auth-xxxxxx

# Sentry source map upload needs these at build time. Passed via
# BuildKit secrets so tokens don't leak into image layers:
#   docker build --secret id=sentry_auth_token,env=SENTRY_AUTH_TOKEN \
#                --build-arg SENTRY_ORG=... --build-arg SENTRY_PROJECT=... .
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ENV SENTRY_ORG=$SENTRY_ORG
ENV SENTRY_PROJECT=$SENTRY_PROJECT
RUN --mount=type=secret,id=sentry_auth_token,env=SENTRY_AUTH_TOKEN \
    bun run build

# Production runtime — pinned to linux/amd64 so local builds on Apple
# Silicon produce an image that runs on the deploy targets, and so the
# narrow outputFileTracingIncludes glob in next.config.ts (which names
# sharp-linux-x64 specifically) always resolves.
FROM --platform=linux/amd64 node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:3000/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]
