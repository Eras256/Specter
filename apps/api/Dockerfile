# Specter decision API — slim Node 22 image for Fly.io.
# Built from the monorepo root context: `docker build -f apps/api/Dockerfile .`
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH"
RUN corepack enable
WORKDIR /app

# ── deps: install every EXTERNAL dependency flat into /app/node_modules ─────────
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY apps/api/package.json apps/api/
# node-linker=hoisted => npm-style flat node_modules (no .pnpm symlink farm), so a
# single COPY of the root node_modules carries every external dependency.
RUN printf 'node-linker=hoisted\n' > .npmrc \
 && pnpm install --frozen-lockfile=false --prod=false

# ── runtime ────────────────────────────────────────────────────────────────────
FROM base AS runtime
ENV NODE_ENV=production
ENV SPECTER_PORT=8080

# 1) External deps (hono, @hono/node-server, ai, @ai-sdk/anthropic, @supabase/*,
#    zod, tsx, …) as a flat tree.
COPY --from=deps /app/node_modules ./node_modules
# 2) Drop pnpm's workspace symlinks (they point outside node_modules and don't
#    survive multi-stage COPY) and replace them with the real package sources, so
#    bare specifiers `@specter/core` / `@specter/db` resolve with zero symlink magic.
RUN rm -rf node_modules/@specter
COPY packages/core ./node_modules/@specter/core
COPY packages/db   ./node_modules/@specter/db
# 3) The API source.
COPY apps/api ./apps/api

EXPOSE 8080
# Run TypeScript directly with tsx — no build step, and no pnpm/corepack at boot
# (which re-downloaded pnpm on every machine start). tsx resolves bare imports
# from the flat /app/node_modules above.
CMD ["node", "--import", "tsx", "apps/api/src/index.ts"]
