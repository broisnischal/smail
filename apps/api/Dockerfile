FROM node:20-alpine AS base

WORKDIR /usr/src/app

RUN apk add --no-cache openssl

# Copy root dependencies
COPY package.json ./
RUN npm install

# Copy API dependencies
COPY apps/api/package.json apps/api/package-lock.json ./apps/api/

# Install API dependencies
WORKDIR /usr/src/app/apps/api
RUN npm ci

# Copy full project
WORKDIR /usr/src/app
COPY . .

# Generate Prisma client (shared)
RUN npx prisma generate --schema=prisma/schema.prisma

# Set working directory to API
WORKDIR /usr/src/app/apps/api
EXPOSE 3000

CMD ["node", "src/index.ts"]
