# Environment Configuration Guide

This document explains how to properly configure the application for different environments.

## Overview

Production applications should use environment variables for configuration, not hardcoded values. This approach:

1. Separates configuration from code
2. Enables different settings for development, staging, and production
3. Prevents sensitive data from being committed to version control
4. Allows deployment flexibility

## Backend Configuration

### Environment Files

- `.env.development` - Development environment settings
- `.env.production` - Production environment settings
- `.env` - Local overrides (not committed to version control)

### Key Environment Variables

```bash
# Server Configuration
NODE_ENV=development|production
PORT=3001
HOST=0.0.0.0
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=psynq
DB_PASSWORD=your_password
DB_DATABASE=psynq

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_API_KEY=your_api_key
TWILIO_API_SECRET=your_api_secret
TWILIO_TWIML_APP_SID=your_twiml_app_sid
```

### Running in Different Environments

```bash
# Development
npm run start:dev

# Production
npm run start:prod
```

## Frontend Configuration

### Environment Files

- `.env.local` - Local development overrides
- `.env.production` - Production build settings

### Key Environment Variables

```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:3001
NEXT_PUBLIC_API_PORT=3001
```

## Production Deployment

### 1. Reverse Proxy Setup

In production, both frontend and backend should be served through the same domain using a reverse proxy (Nginx, Apache, or cloud load balancer). This:

- Eliminates CORS issues entirely
- Provides SSL termination
- Enables load balancing
- Offers caching capabilities

### Example Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. Container Orchestration

When using Docker/Kubernetes:

1. Use ConfigMaps for non-sensitive configuration
2. Use Secrets for sensitive data (passwords, API keys)
3. Inject environment variables at runtime

### 3. Environment-Specific Builds

```bash
# Development build with environment variables
NODE_ENV=development npm run build

# Production build with optimizations
NODE_ENV=production npm run build
```

## Best Practices

1. **Never commit sensitive data** to version control
2. **Use different databases** for each environment
3. **Enable debug logging** only in development
4. **Use SSL/TLS** in production
5. **Monitor and log** configuration changes
6. **Document all environment variables** for your team
7. **Validate required environment variables** on startup

## Troubleshooting

### CORS Issues

If you encounter CORS errors:

1. Verify the CORS_ORIGINS environment variable includes your frontend URL
2. Check that the backend is accessible from the frontend (same network)
3. Ensure you're not mixing HTTP and HTTPS protocols
4. Verify proxy headers are correctly forwarded if using a reverse proxy

### Localhost vs 127.0.0.1

Browsers treat `localhost` and `127.0.0.1` as different origins. To avoid issues:

1. Use the same hostname consistently throughout your application
2. Include both variants in CORS_ORIGINS for local development
3. Use environment variables to configure URLs dynamically