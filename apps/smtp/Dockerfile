FROM oven/bun:1-alpine AS base
WORKDIR /usr/src/app

# Install OpenSSL
RUN apk add --no-cache openssl

# Copy root dependencies
COPY package.json bun.lock ./
COPY apps/smtp/package.json* ./apps/smtp/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN bunx prisma generate

# Copy SMTP source
COPY apps/smtp ./apps/smtp/

EXPOSE 25
CMD ["bun", "run", "apps/smtp/index.ts"]