# -------------------------------------------------------------
# Researchify AI Production Dockerfile
# Multi-stage optimized build for high performance & security
# -------------------------------------------------------------

# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache libc6-compat

# Copy package manifests
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies needed for Vite/TanStack build)
RUN npm ci

# Copy full application source
COPY . .

# Build the production bundle
ENV NODE_ENV=production
RUN npm run build

# -------------------------------------------------------------
# Stage 2: Production Runner
# -------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

# Install runtime security packages
RUN apk add --no-cache curl ca-certificates

# Create non-root system user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 researchify

# Copy built artifacts and necessary files
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/src/server.ts ./src/server.ts

# Set correct file ownership
RUN chown -R researchify:nodejs /app

USER researchify

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8080}/ || exit 1

# Start the TanStack Start production server
CMD ["npm", "start"]
