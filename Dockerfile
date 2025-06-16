FROM oven/bun:1-alpine
WORKDIR /app

# Install OpenSSL
RUN apk add --no-cache openssl

COPY package.json bun.lock ./
RUN bun install

COPY prisma ./prisma/
COPY . .

CMD ["bun", "run", "start"]