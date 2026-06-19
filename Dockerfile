# syntax=docker/dockerfile:1
# Multi-stage build for the Hanzo Waitlist demo (Next.js 16, pnpm + turbo
# monorepo). apps/web (@hanzo/waitlist-demo) consumes the @hanzo/waitlist
# workspace widget; turbo builds the dep first. Runtime uses Next standalone
# output on a minimal node:22-slim — no nginx/caddy.

# ---- deps + build ----
FROM node:22-slim AS build
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# Copy the whole workspace (lockfile + manifests + sources). The pnpm
# workspace graph needs every package.json present to resolve workspace:* deps.
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# Build the web app; turbo's ^build first builds the @hanzo/waitlist widget.
RUN pnpm --filter @hanzo/waitlist-demo... build

# ---- runtime (Next standalone server) ----
FROM node:22-slim AS runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app

# Standalone output (monorepo layout): server + traced node_modules under
# .next/standalone, hashed assets under .next/static, public/ served as-is.
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public

EXPOSE 3000
# Monorepo standalone places the app's server entry under apps/web/.
CMD ["node", "apps/web/server.js"]
