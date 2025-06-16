FROM oven/bun:1-alpine AS base

WORKDIR /usr/src/app

RUN apk add --no-cache openssl

# Copy API dependencies
COPY apps/api/package.json apps/api/bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy Prisma schema
COPY prisma/schema.prisma ./prisma/schema.prisma

# Copy generated Prisma client
COPY generated/prisma ./generated/prisma

# Copy API source code
COPY apps/api .

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]