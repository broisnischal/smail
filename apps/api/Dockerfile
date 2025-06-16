FROM oven/bun:1-alpine AS base
WORKDIR /usr/src/app

# Install OpenSSL
RUN apk add --no-cache openssl

# Copy root dependencies
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/

# Install all dependencies
RUN bun install --frozen-lockfile

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN bunx prisma generate

# Copy API source
COPY apps/api ./apps/api/

EXPOSE 3000
CMD ["bun", "run", "apps/api/index.ts"]