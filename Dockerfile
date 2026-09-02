# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package manifests for efficient caching
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/platform/package.json packages/platform/
COPY packages/codesentinel/package.json packages/codesentinel/
COPY packages/web/package.json packages/web/
COPY packages/mcp/package.json packages/mcp/
COPY packages/recon/package.json packages/recon/
COPY packages/eval/package.json packages/eval/

# Install all dependencies (including devDependencies required for TS compilation)
RUN npm ci

# Copy full source
COPY . .

# Build all packages via the monorepo root
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Copy the built monorepo and node_modules from builder
# In a truly optimized enterprise setup we would prune devDependencies,
# but for a monorepo this ensures all workspace symlinks remain intact.
COPY --from=builder /app /app

# Create a non-root user for security
RUN addgroup -S sentinel && adduser -S sentinel -G sentinel
USER sentinel

# Set environment variables for structured logging
ENV NODE_ENV=production
ENV JSON_LOGS=true

# Expose Web GUI and Dashboard ports
EXPOSE 3333 5173

ENTRYPOINT ["node", "packages/platform/dist/cli.js"]
CMD ["scan", "--help"]
