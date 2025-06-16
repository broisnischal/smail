FROM oven/bun:1 as base
WORKDIR /usr/src/app

# Copy root package files
COPY package.json bun.lock ./
COPY apps/smtp/package.json apps/smtp/bun.lock* ./apps/smtp/

# Install root dependencies
RUN bun install --frozen-lockfile

# Install SMTP dependencies
WORKDIR /usr/src/app/apps/smtp
RUN bun install --frozen-lockfile

# Copy SMTP source code
COPY apps/smtp/index.ts ./

WORKDIR /usr/src/app/apps/smtp

EXPOSE 2525
CMD ["bun", "run", "index.ts"]