# Smail - Email Alias Service

## Environment Setup

Before running the application, you need to create a `.env` file in the root directory with the following variables:

### Development Environment
```bash
# JWT Secret for signing tokens (generate a strong random string for production)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Database URL (for local development)
DATABASE_URL=file:./shared/prisma/dev.db

# Client URL for redirects
CLIENT_URL=http://localhost:5173

# API URL for UI requests
API_URL=http://localhost:3000/api

# Domain (for Caddy configuration)
DOMAIN=localhost
```

### Production Environment
```bash
# JWT Secret for signing tokens (generate a strong random string for production)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Database URL (for production)
DATABASE_URL=file:./shared/prisma/prod.db

# Client URL for redirects
CLIENT_URL=https://mail.snehaa.store

# API URL for UI requests
API_URL=https://mail.snehaa.store/api

# Domain (for Caddy configuration)
DOMAIN=mail.snehaa.store
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

### Production Deployment
```bash
# Set production environment variables in .env
# Build and run all services
docker-compose up --build

# Access the application
# UI: https://mail.snehaa.store
# API: https://mail.snehaa.store/api
```

## Domain Configuration

The application supports both development and production domains:

- **Development**: `localhost` (HTTP)
- **Production**: `mail.snehaa.store` (HTTPS with automatic SSL)

### DNS Configuration

For production, make sure your DNS is configured to point `mail.snehaa.store` to your server's IP address.

## Security Notes

- Never commit the `.env` file to version control
- Use strong, random secrets in production
- The `.env` file is already added to `.gitignore`
- Caddy automatically handles SSL certificates for production domains 