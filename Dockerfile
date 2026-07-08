# syntax=docker/dockerfile:1

# Multi-stage build: deps -> build -> runtime. Targets a single self-hosted
# container (e.g. Unraid) with a persistent /data volume for the SQLite
# database and uploaded receipts.

# ---- deps: install all dependencies (dev included - needed to compile
#             better-sqlite3's native addon and to build the app) ----
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: generate the Prisma client and build the Next.js app ----
FROM node:20-alpine AS builder
WORKDIR /app
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

# su-exec drops root privileges after the entrypoint fixes up /data
# ownership for the requested PUID/PGID (see docker-entrypoint.sh).
RUN apk add --no-cache su-exec

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
