FROM oven/bun:1.0.36 as builder

WORKDIR /app

# Copy all necessary files for workspaces
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY apps/smtp/package.json ./apps/smtp/
COPY apps/ui/package.json ./apps/ui/
COPY shared/package.json ./shared/

# Copy source files
COPY shared ./shared
COPY apps/api ./apps/api
COPY apps/smtp ./apps/smtp
COPY apps/ui ./apps/ui

# Install dependencies
RUN bun install

# Generate Prisma client
RUN cd shared && bunx prisma generate

# Production image
FROM oven/bun:1.0.36-slim

WORKDIR /app

# Copy only what's needed for migrations
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/node_modules ./node_modules

# Set working directory for migrations
WORKDIR /app/shared/prisma

# Default command (can be overridden by docker-compose)
CMD ["bunx", "prisma", "migrate", "deploy"]