# Multi-stage Dockerfile for backend
# - `deps` builds node_modules (including mediasoup compilation) at build time
# - `builder` builds @psynq/core
# - `dev` is the dev image that contains preinstalled node_modules and can be used with bind mounts for hot reload

# Stage: deps (install all deps, compile native modules)
FROM node:22-bullseye-slim AS deps
# Install minimal tools required to fetch the prebuilt worker
RUN apt-get -o Acquire::Retries=3 update && apt-get -o Acquire::Retries=3 install -y --no-install-recommends --fix-missing \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app
COPY package*.json ./
COPY package-lock.json ./
COPY packages/core/package*.json ./packages/core/
COPY packages/backend/package*.json ./packages/backend/

# Prefetch mediasoup prebuilt worker (if available); if fetch fails, install build toolchain as a fallback
ENV MEDIASOUP_WORKER_BIN=/tmp/mediasoup-worker.tgz
RUN set -e; \
    echo "Attempting to prefetch mediasoup worker (if available)"; \
    version=$(node -e "try { const p=require('./package-lock.json'); const v=(p.packages && p.packages['node_modules/mediasoup'] && p.packages['node_modules/mediasoup'].version) || (p.dependencies && p.dependencies.mediasoup && p.dependencies.mediasoup.version) || require('./packages/backend/package.json').dependencies.mediasoup || ''; console.log(v.replace(/^\\^/,'')); } catch(e){ console.log(''); }"); \
    fetched=0; \
    if [ -n "$version" ]; then \
      for suffix in "linux-x64-kernel6" "linux-x64"; do \
        url="https://github.com/versatica/mediasoup/releases/download/$version/mediasoup-worker-$version-$suffix.tgz"; \
        echo "Trying $url"; \
        if curl -fSL --retry 3 --retry-delay 2 -o "$MEDIASOUP_WORKER_BIN" "$url"; then echo "Downloaded worker to $MEDIASOUP_WORKER_BIN"; fetched=1; break; else echo "Failed to fetch $url"; fi; \
      done; \
    else echo "Mediasoup version not found; skipping prefetch"; fi; \
    if [ "$fetched" -eq 0 ]; then \
      echo "Prefetch failed — installing build toolchain (may increase build time)"; \
      apt-get -o Acquire::Retries=3 update && apt-get -o Acquire::Retries=3 install -y --no-install-recommends --fix-missing \
        python3 python3-pip make g++ gcc build-essential libssl-dev ninja-build pkg-config git curl ca-certificates \
        && rm -rf /var/lib/apt/lists/*; \
    fi; \
    npm config set registry https://registry.npmjs.org/ && \
    npm install --include-workspace-root --workspace=backend --workspace=@psynq/core \
      --no-audit --no-fund --verbose

# Stage: builder (build core and prepare artifacts)
FROM deps AS builder
WORKDIR /usr/src/app
COPY packages/core ./packages/core
WORKDIR /usr/src/app/packages/core
RUN npm run build

# Copy backend source so the build context contains it (fallback)
WORKDIR /usr/src/app
COPY packages/backend ./packages/backend

# Stage: dev (fast dev image with preinstalled deps)
FROM node:22-bullseye-slim AS dev
WORKDIR /usr/src/app

# Install minimal runtime tools for healthchecks (curl)
RUN apt-get -o Acquire::Retries=3 update && apt-get -o Acquire::Retries=3 install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/*

# copy node_modules (workspace root modules)
COPY --from=deps /usr/src/app/node_modules ./node_modules

# ensure @psynq/core package is available to TypeScript by placing the built package in node_modules
RUN rm -rf ./node_modules/@psynq/core || true && mkdir -p ./node_modules/@psynq/core
COPY --from=builder /usr/src/app/packages/core/dist ./node_modules/@psynq/core/dist
COPY --from=builder /usr/src/app/packages/core/package.json ./node_modules/@psynq/core/package.json

# copy built core dist and its node_modules (fallback)
COPY --from=builder /usr/src/app/packages/core/dist ./packages/core/dist
COPY --from=deps /usr/src/app/packages/core/node_modules ./packages/core/node_modules

# copy backend source
COPY --from=builder /usr/src/app/packages/backend ./packages/backend

# set working directory to backend
WORKDIR /usr/src/app/packages/backend
ENV NODE_ENV=development
EXPOSE 3001 9229

HEALTHCHECK --interval=10s --timeout=5s --start-period=40s --retries=5 \
  CMD curl -f http://127.0.0.1:3001/health || exit 1

CMD ["npm", "run", "start:dev"]

# Production target (optional) - build production image
FROM node:22-bullseye-slim AS prod
WORKDIR /usr/src/app
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/packages/core/dist ./packages/core/dist
COPY --from=builder /usr/src/app/packages/backend ./packages/backend
WORKDIR /usr/src/app/packages/backend
ENV NODE_ENV=production
EXPOSE 3001
CMD ["npm", "run", "start:prod"]