# Build from the repository root: docker build -f apps/api/Dockerfile .
FROM node:26-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm exec turbo run build --filter=@elo/api...

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/core/package.json packages/core/
COPY packages/config/package.json packages/config/
RUN pnpm install --frozen-lockfile --prod --filter @elo/api...

FROM node:26-slim AS run
ENV NODE_ENV=production UPLOAD_DIR=/data/uploads
WORKDIR /repo
COPY --from=deps /repo ./
COPY --from=build /repo/packages/core/dist packages/core/dist
COPY --from=build /repo/apps/api/dist apps/api/dist
RUN mkdir -p /data/uploads && chown -R node:node /data
USER node
WORKDIR /repo/apps/api
EXPOSE 3001
# Before the first production deploy, generate the initial migration
# (pnpm --filter @elo/api migration:generate) and run it here before starting.
CMD ["node", "dist/main.js"]
