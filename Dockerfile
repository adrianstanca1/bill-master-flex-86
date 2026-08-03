# syntax=docker/dockerfile:1
# Production image for the Invoice Builder React frontend (Vite + React 18)
# Serves the built static bundle with a minimal Node server so client-side routing works.

FROM node:22-bookworm-slim AS builder
WORKDIR /app

# Install native build deps if any package needs them (sharp, sqlite, etc.)
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .

# Vite inlines import.meta.env at build time, so pass the API base URL here.
ARG VITE_INVOICESMART_API_URL=https://api.invoicesmart.cortexbuildpro.com
ENV VITE_INVOICESMART_API_URL=${VITE_INVOICESMART_API_URL}

RUN npm run build

# ── Production stage ──
FROM node:22-bookworm-slim AS production
WORKDIR /app

# Install curl for the Docker HEALTHCHECK
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

# Use a tiny static server that supports SPA fallback routing.
RUN npm install -g serve@14

# Switch to non-root user
USER node

# Runtime env is injected via docker-compose; only the built assets are baked here.
COPY --from=builder --chown=node:node /app/dist ./dist

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -fsS http://localhost:3000/ || exit 1

# serve: -s serves single-page apps by returning index.html for unknown paths.
CMD ["serve", "-s", "dist", "-l", "3000"]
