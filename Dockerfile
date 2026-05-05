# syntax=docker/dockerfile:1.10
# Trust Admin — containerized build. Primary deploy target is Vercel;
# this image is for homelab / alternate hosts. Migrations run OUTSIDE
# this image (from CI or a dev machine) — drizzle-kit is a devDep and
# db/migrations/ is not copied into the runtime.

# Platform is set by the build invocation, not pinned in the Dockerfile.
# - CI deploy.yml passes `platforms: linux/amd64` to buildx, which sets
#   TARGETPLATFORM and produces an amd64 image for the deploy targets.
# - Local Apple Silicon devs who want to test the production-equivalent
#   image must run `docker buildx build --platform linux/amd64 .`.
# Hardcoding `--platform=linux/amd64` on FROM trips BuildKit's
# FromPlatformFlagConstDisallowed lint; using `$TARGETPLATFORM` trips
# RedundantTargetPlatform. Letting buildx do its job is the only
# warning-free shape — and it's what Docker's multi-platform docs
# recommend.
FROM oven/bun:1 AS base

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

# Sentry source map upload needs these at build time. SENTRY_AUTH_TOKEN
# is passed as a build-arg (NOT a BuildKit secret mount) because the
# canonical build path is buildah-via-Woodpecker, and buildah doesn't
# implement --mount=type=secret. The ARG only exists during the builder
# stage's RUN — it doesn't carry into the runtime image.
#   buildah build --build-arg SENTRY_ORG=... \
#                 --build-arg SENTRY_PROJECT=... \
#                 --build-arg SENTRY_AUTH_TOKEN=... .
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ARG SENTRY_AUTH_TOKEN
ENV SENTRY_ORG=$SENTRY_ORG
ENV SENTRY_PROJECT=$SENTRY_PROJECT

# Build-time-only env vars are set inline on the RUN command so they
# never persist as ENV directives in any image layer:
# - SKIP_ENV_VALIDATION=1 — skip Zod env validation; instrumentation.ts
#   handles strict validation at server startup. Mirrors ci.yml.
# - NEON_AUTH_COOKIE_SECRET — @neondatabase/auth requires cookies.secret
#   at module-init time (during next build's page-data collection, not
#   just at request time), so next build fails without it. The fixed
#   placeholder below is never used to sign real cookies; runtime
#   overrides via the ExternalSecret-injected secret. Inlining (vs ENV)
#   satisfies BuildKit's SecretsUsedInArgOrEnv lint, which flags any
#   ENV/ARG whose name suggests it carries a secret.
# - SENTRY_AUTH_TOKEN — withSentryConfig in next.config.ts reads it
#   during `bun run build` to upload source maps. Inline-scoped so it
#   doesn't bake into image layers via ENV.
RUN \
    SKIP_ENV_VALIDATION=1 \
    NEON_AUTH_COOKIE_SECRET=ci-build-placeholder-not-used-for-real-auth-xxxxxx \
    SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN \
    bun run build

# Production runtime. Platform comes from the buildx invocation (see
# the base-stage comment) — the deploy.yml passes linux/amd64, which is
# also what next.config.ts's narrow outputFileTracingIncludes glob
# (`sharp-linux-x64`) requires.
FROM node:22-slim AS runner
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
