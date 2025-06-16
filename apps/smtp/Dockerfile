FROM oven/bun:1.0.36 as builder

WORKDIR /app

# Copy only necessary package files
COPY package.json bun.lock ./
COPY apps/smtp/package.json ./apps/smtp/
COPY shared/package.json ./shared/

# Copy only necessary source files
COPY shared ./shared
COPY apps/smtp ./apps/smtp

# Install dependencies
RUN bun install

# Generate Prisma client
RUN cd shared && bunx prisma generate

# Production image
FROM oven/bun:1.0.36-slim

WORKDIR /app

# Copy everything we need from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/smtp ./apps/smtp
COPY --from=builder /app/shared/generated/prisma ./shared/generated/prisma

# Create directory for database
RUN mkdir -p /app/shared/prisma

# Set working directory to the SMTP app
WORKDIR /app/apps/smtp

# Expose the SMTP port
EXPOSE 25

# Start the application
CMD ["bun", "run", "index.ts"]