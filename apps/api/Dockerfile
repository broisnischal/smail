FROM oven/bun:1.0.36 as builder

WORKDIR /app

# Copy only necessary package files
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY shared/package.json ./shared/

# Copy only necessary source files
COPY shared ./shared
COPY apps/api ./apps/api

# Install dependencies
RUN bun install

# Generate Prisma client
RUN cd shared && bunx prisma generate

# Production image
FROM oven/bun:1.0.36-slim

WORKDIR /app

# Copy everything we need from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/shared/generated/prisma ./shared/generated/prisma

# Create directory for database
RUN mkdir -p /app/shared/prisma

# Set working directory to the API app
WORKDIR /app/apps/api

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["bun", "run", "src/index.ts"]