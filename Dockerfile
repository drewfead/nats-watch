# syntax=docker.io/docker/dockerfile:1

FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* ./
RUN \
    if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
    else echo "Lockfile not found." && exit 1; \
    fi


# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED=1

# Define build arguments with defaults
ARG NEXT_PUBLIC_MULTICLUSTER_ENABLED=true

# Use the build arguments to set environment variables
ENV NEXT_PUBLIC_MULTICLUSTER_ENABLED=${NEXT_PUBLIC_MULTICLUSTER_ENABLED}

RUN \
    if [ -f yarn.lock ]; then yarn run build; \
    elif [ -f package-lock.json ]; then npm run build; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
    else echo "Lockfile not found." && exit 1; \
    fi

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED=1

# Define build arguments with defaults for the runner stage
ARG NEXT_PUBLIC_MULTICLUSTER_ENABLED=true
ARG NATS_CLUSTER_AUTO_IMPORT=true
ARG NATS_CLUSTER_AUTO_IMPORT_PATH=/etc/nats

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Ensure /tmp/.nats-watch directory exists and is writable
RUN mkdir -p /tmp/.nats-watch && chown -R nextjs:nodejs /tmp/.nats-watch

USER nextjs

EXPOSE 9666

ENV PORT=9666
ENV HOSTNAME="0.0.0.0"
ENV NEXT_PUBLIC_MULTICLUSTER_ENABLED=${NEXT_PUBLIC_MULTICLUSTER_ENABLED}
ENV NATS_CLUSTER_AUTO_IMPORT=${NATS_CLUSTER_AUTO_IMPORT}
ENV NATS_CLUSTER_AUTO_IMPORT_PATH=${NATS_CLUSTER_AUTO_IMPORT_PATH}
ENV NATS_WATCH_CONFIG_DIR="/tmp/.nats-watch"

# Use the standard Next.js server
CMD ["node", "server.js"]