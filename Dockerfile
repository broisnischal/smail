FROM oven/bun:1 as base
WORKDIR /usr/src/app

# Install system dependencies
RUN apt-get update && apt-get install -y \
  openssl \
  && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy prisma and generated files
COPY prisma ./prisma
COPY generated ./generated

# Generate Prisma client
RUN bunx prisma generate

CMD ["bunx", "prisma", "migrate", "deploy"]