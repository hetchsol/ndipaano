# =============================================================================
# Ndipaano API - Multi-stage Docker build for Render deployment
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Install dependencies
# ---------------------------------------------------------------------------
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copy workspace root files needed for install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies
RUN pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# Stage 2: Build the application
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY tsconfig.json ./

# Generate Prisma client
RUN cd apps/api && npx prisma generate

# Build shared package first
RUN cd packages/shared && pnpm build || true

# Build the API
RUN cd apps/api && pnpm build

# ---------------------------------------------------------------------------
# Stage 3: Production image
# ---------------------------------------------------------------------------
FROM node:20-alpine AS production

RUN apk add --no-cache libc6-compat openssl dumb-init

# Run as non-root user for security
RUN addgroup --system --gid 1001 ndipaano && \
    adduser --system --uid 1001 ndipaano

WORKDIR /app

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Copy built application
COPY --from=builder --chown=ndipaano:ndipaano /app/apps/api/dist ./dist
COPY --from=builder --chown=ndipaano:ndipaano /app/apps/api/package.json ./
COPY --from=builder --chown=ndipaano:ndipaano /app/apps/api/prisma ./prisma

# Copy node_modules (production only would be ideal, but for monorepo compat)
COPY --from=builder --chown=ndipaano:ndipaano /app/node_modules ./node_modules
COPY --from=builder --chown=ndipaano:ndipaano /app/apps/api/node_modules ./apps_api_node_modules

# Merge node_modules if needed (workspace deps)
RUN cp -rn ./apps_api_node_modules/* ./node_modules/ 2>/dev/null || true && \
    rm -rf ./apps_api_node_modules

# Copy Prisma generated client
COPY --from=builder --chown=ndipaano:ndipaano /app/apps/api/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=ndipaano:ndipaano /app/apps/api/node_modules/@prisma ./node_modules/@prisma

# Switch to non-root user
USER ndipaano

# Expose the API port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Use dumb-init to handle PID 1 and signal forwarding
ENTRYPOINT ["dumb-init", "--"]

# Run Prisma migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
