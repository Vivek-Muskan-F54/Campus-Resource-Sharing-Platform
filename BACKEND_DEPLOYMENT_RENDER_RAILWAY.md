# Backend Deployment Guide: Render or Railway

This guide covers deployment of the Spring Boot backend to Render or Railway.

## 1. Build Configuration Review

The backend is production-ready for container-based deployment:

- Reads all sensitive values from environment variables
- Uses secure hashed refresh tokens
- Supports `prod` profile configuration in [backend/src/main/resources/application.yml](/D:/JAVA/Campus%20Resource%20Sharing%20Platform/backend/src/main/resources/application.yml)
- Exposes production monitoring endpoints through Spring Boot Actuator

## 2. Required Environment Variables

Configure these in the Render or Railway service settings:

```bash
SPRING_PROFILES_ACTIVE=prod
SERVER_PORT=8080
DB_URL=jdbc:mysql://your-managed-mysql-host:3306/campus_share
DB_USERNAME=campus_user
DB_PASSWORD=replace-with-production-password
DDL_AUTO=validate
JWT_SECRET=replace-with-at-least-32-bytes-random-secret
JWT_ACCESS_EXPIRATION_MS=900000
JWT_REFRESH_EXPIRATION_MS=604800000
APP_NAME=Campus Resource Sharing Platform Backend
APP_VERSION=1.0.0
APP_ENV=prod
APP_ADMIN_EMAIL=admin@campus.edu
APP_ADMIN_PASSWORD=replace-with-strong-admin-password
FRONTEND_URL=https://your-vercel-app.vercel.app
MAIL_FROM=no-reply@your-domain.com
MAIL_HOST=smtp.your-provider.com
MAIL_PORT=587
MAIL_USERNAME=your-smtp-username
MAIL_PASSWORD=your-smtp-password
MAIL_SMTP_AUTH=true
MAIL_SMTP_STARTTLS_ENABLE=true
MAIL_SMTP_CONNECTION_TIMEOUT=5000
MAIL_SMTP_TIMEOUT=5000
MAIL_SMTP_WRITE_TIMEOUT=5000
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CORS_ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
AUTH_EMAIL_VERIFICATION_EXPIRATION_MS=86400000
AUTH_PASSWORD_RESET_EXPIRATION_MS=1800000
```

## 3. Render Deployment Steps

1. Create a new Render Web Service.
2. Connect the GitHub repository.
3. Set the root directory to `backend`.
4. Use the Dockerfile or build command supported by your backend service setup.
5. Attach the environment variables above.
6. Point the service at the managed MySQL instance.
7. Verify `/actuator/health` and `/actuator/info` after deploy.

## 4. Railway Deployment Steps

1. Create a new Railway service from the GitHub repo.
2. Set the service to use the `backend` directory.
3. Add the environment variables above.
4. Configure the managed MySQL plugin or external managed database.
5. Deploy and verify actuator endpoints.

## 5. Backend Production Notes

- Keep `DDL_AUTO=validate` in production.
- Do not point production at a local MySQL container.
- Use a real SMTP provider so verification and reset emails are delivered.
- Confirm `CORS_ALLOWED_ORIGINS` matches the exact frontend domain.

## 6. Backend Production Checklist

- `mvn test` passes in CI
- Docker image builds successfully
- `/actuator/health` returns `UP`
- `/actuator/info` exposes application metadata
- `/actuator/metrics` is reachable by authorized users
- Email verification and password reset links use the production frontend URL

