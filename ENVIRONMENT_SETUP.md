# Environment Setup Documentation

This document explains how to prepare the environment variables required for local, staging, and production deployments.

## 1. Backend Variables

Use the values from [backend/.env.example](/D:/JAVA/Campus%20Resource%20Sharing%20Platform/backend/.env.example) as the source of truth.

Minimum production variables:

```bash
SPRING_PROFILES_ACTIVE=prod
SERVER_PORT=8080
DB_URL=jdbc:mysql://your-host:3306/campus_share
DB_USERNAME=campus_user
DB_PASSWORD=replace-with-db-password
DDL_AUTO=validate
JWT_SECRET=replace-with-strong-random-secret
APP_ADMIN_EMAIL=admin@campus.edu
APP_ADMIN_PASSWORD=replace-with-strong-admin-password
FRONTEND_URL=https://your-frontend-domain.com
MAIL_FROM=no-reply@your-domain.com
MAIL_HOST=smtp.your-provider.com
MAIL_PORT=587
MAIL_USERNAME=your-smtp-username
MAIL_PASSWORD=your-smtp-password
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CORS_ALLOWED_ORIGINS=https://your-frontend-domain.com
```

## 2. Frontend Variables

Use the values from [frontend/.env.example](/D:/JAVA/Campus%20Resource%20Sharing%20Platform/frontend/.env.example).

Minimum production variables:

```bash
VITE_API_URL=https://your-backend-domain.com/api
VITE_WS_URL=wss://your-backend-domain.com/ws
```

## 3. Local Development

For local development:

- Backend can point to local MySQL or the Docker Compose MySQL service
- Frontend can use `http://localhost:8080/api`
- `SPRING_PROFILES_ACTIVE=local` is suitable for local runs

## 4. Staging

Staging should mirror production as closely as possible:

- Use a managed MySQL instance or a dedicated staging database
- Use a staging frontend domain and staging backend domain
- Keep SMTP credentials pointed at a non-production mailbox or a mail testing service

## 5. Secret Handling

- Never commit `.env` files
- Keep secrets in the hosting provider's environment settings or secret manager
- Rotate JWT and SMTP credentials on a schedule

