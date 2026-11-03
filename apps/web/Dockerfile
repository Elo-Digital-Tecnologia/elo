# Build from the repository root: docker build -f apps/web/Dockerfile .
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /repo

FROM base AS build
# Next writes these into the build: changing one needs a new image.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_API_DOCS
ARG API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL NEXT_PUBLIC_API_DOCS=$NEXT_PUBLIC_API_DOCS API_URL=$API_URL \
    NEXT_OUTPUT=standalone NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm exec turbo run build --filter=@elo/web...

FROM node:22-slim AS run
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public apps/web/public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
