# syntax=docker/dockerfile:1

# Multi-stage build: deps -> build -> runtime. Targets a single self-hosted
# container (e.g. Unraid) with a persistent /data volume for the SQLite
# database and uploaded receipts.

# ---- base: shared setup for stages that hit the network (apk/npm) ----
FROM node:20-alpine AS base
WORKDIR /app
# Optional corporate/proxy root CA for TLS-inspecting networks - drop a
# .crt/.pem file in certs/ and it's trusted here before any apk/npm network
# call runs. No-op if certs/ is empty (just the tracked README.md). See
# certs/README.md for why this exists and how to use it.
COPY certs/ /usr/local/share/ca-certificates/
RUN for f in /usr/local/share/ca-certificates/*.crt /usr/local/share/ca-certificates/*.pem; do \
      [ -f "$f" ] && cat "$f" >> /etc/ssl/certs/ca-certificates.crt; \
    done; true
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt

# ---- deps: install all dependencies (dev included - needed to compile
#             better-sqlite3's native addon and to build the app) ----
FROM base AS deps
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: generate the Prisma client and build the Next.js app ----
FROM base AS builder
RUN apk add --no-cache python3 make g++
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

# ---- runner: minimal production image ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Defaults so a single /data bind mount (e.g. Unraid appdata) covers both
# the database file and uploaded attachments - see README for details.
ENV DATABASE_URL="file:/data/auto-tracker.db"
ENV UPLOADS_DIR="/data/uploads"

# Privilege drop (after the entrypoint fixes up /data ownership for the
# requested PUID/PGID) uses busybox's built-in `su`, not the su-exec apk
# package - see docker-entrypoint.sh. That avoids an extra apk fetch here
# (busybox su already ships in the base image), which matters because some
# build environments can't reach Alpine's package CDN (TLS-inspecting
# corporate proxies, etc.) even though earlier apk installs above succeed
# from Docker's build cache.

# Next.js standalone server + static assets.
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# The standalone output only traces production runtime deps actually
# `require`d by Next's server bundle, which can miss better-sqlite3's native
# addon and the prisma/tsx CLIs the entrypoint shells out to. Overlaying the
# full node_modules from the builder (superset) is simpler and more robust
# than hand-picking packages, at the cost of a larger image.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Prisma schema/migrations/seed script + config, used by the entrypoint.
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && mkdir -p /data

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
