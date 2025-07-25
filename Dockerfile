# ───────────────────────────────────────────────────────────────────────────────
# Stage 1: Build & generate Prisma client
# ───────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY apps/api/package.json    ./apps/api/
COPY apps/smtp/package.json   ./apps/smtp/
COPY apps/ui/package.json     ./apps/ui/
COPY shared/package.json      ./shared/

# Copy source
COPY shared          ./shared
COPY apps/api        ./apps/api
COPY apps/smtp       ./apps/smtp
COPY apps/ui         ./apps/ui

RUN npm install

# Generate Prisma client
WORKDIR /app/shared
RUN npx prisma generate --schema=./prisma/schema.prisma



# ───────────────────────────────────────────────────────────────────────────────
# Stage 2: Migration runner (with OpenSSL via apk)
# ───────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy only what's needed
COPY --from=builder /app/shared        ./shared
COPY --from=builder /app/node_modules  ./node_modules
COPY --from=builder /app/package.json  ./package.json

# Prisma schema location
WORKDIR /app/shared/prisma

CMD ["npx", "prisma", "migrate", "deploy", "--schema=./schema.prisma"]


# # Base image for building
# FROM node:20-alpine AS builder


# # RUN apt-get update \
# #   && apt-get install -y --no-install-recommends openssl \
# #   && rm -rf /var/lib/apt/lists/*
# RUN apk add --no-cache openssl

# WORKDIR /app


# # Copy root package files and workspace package.jsons
# COPY package.json package-lock.json ./
# COPY apps/api/package.json ./apps/api/
# COPY apps/smtp/package.json ./apps/smtp/
# COPY apps/ui/package.json ./apps/ui/
# COPY shared/package.json ./shared/

# # Copy source files
# COPY shared ./shared
# COPY apps/api ./apps/api
# COPY apps/smtp ./apps/smtp
# COPY apps/ui ./apps/ui

# # Install dependencies (including workspaces)
# RUN npm install

# # Generate Prisma client
# WORKDIR /app/shared
# RUN npx prisma generate --schema=./prisma/schema.prisma

# # Production image
# FROM node:20-slim AS runner

# WORKDIR /app

# # Copy only what's needed for migrations
# COPY --from=builder /app/shared ./shared
# COPY --from=builder /app/node_modules ./node_modules
# COPY --from=builder /app/package.json ./package.json

# # Set working directory for migrations
# WORKDIR /app/shared/prisma

# # Default command (can be overridden)
# CMD ["npx", "prisma", "migrate", "deploy"]
