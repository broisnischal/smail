FROM oven/bun:1-alpine AS base

WORKDIR /usr/src/app

RUN apk add --no-cache openssl

# Copy root dependencies first
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy API dependencies
COPY apps/api/package.json apps/api/bun.lock ./apps/api/

# Install API dependencies
WORKDIR /usr/src/app/apps/api
RUN bun install --frozen-lockfile

# Copy the rest of the project
WORKDIR /usr/src/app
COPY . .

# Set final working directory
WORKDIR /usr/src/app/apps/api
EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]