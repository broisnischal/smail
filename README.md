# Smail - Email Alias Service

## Environment Setup

Before running the application, you need to create a `.env` file in the root directory with the following variables:

```bash
# JWT Secret for signing tokens (generate a strong random string for production)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Database URL (for local development)
DATABASE_URL=file:./shared/prisma/dev.db

# Client URL for redirects
CLIENT_URL=http://localhost:5173

# API URL for UI requests
API_URL=http://localhost:3000/api
```

## Development

### Local Development
```bash
# Install dependencies
bun install

# Generate Prisma client
cd shared && bunx prisma generate

# Run services
cd apps/api && bun run dev
cd apps/ui && npm run dev
```

### Docker Development
```bash
# Build and run all services
docker-compose up --build

# Access the application
# UI: http://localhost:5173
# API: http://localhost:3000
# Caddy (with routing): http://localhost
```

## Security Notes

- Never commit the `.env` file to version control
- Use strong, random secrets in production
- The `.env` file is already added to `.gitignore` 