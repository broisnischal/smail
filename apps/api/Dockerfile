FROM oven/bun:1 as base
WORKDIR /usr/src/app

# Copy root package files
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/bun.lock* ./apps/api/

# Install root dependencies first
RUN bun install --frozen-lockfile

# Copy shared libraries
COPY apps/lib ./apps/lib

# Install API dependencies
WORKDIR /usr/src/app/apps/api
RUN bun install --frozen-lockfile

# Copy API source code
COPY apps/api/src ./src
COPY apps/api/tsconfig.json ./

# Copy generated Prisma client and schema
COPY generated /usr/src/app/generated
COPY prisma /usr/src/app/prisma

WORKDIR /usr/src/app/apps/api

EXPOSE 3000
CMD ["bun", "run", "src/index.ts"]