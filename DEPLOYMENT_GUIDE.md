# Production Deployment Guide

This guide covers a clean production setup for the Campus Resource Sharing Platform.

## 1. Prerequisites

- Java 21
- Maven 3.9+
- Node.js 20+
- MySQL 8
- Cloudinary account
- HTTPS domain or reverse proxy

## 2. Environment Variables

### Backend

Set these variables in your deployment environment:

```bash
SPRING_PROFILES_ACTIVE=prod
DB_URL=jdbc:mysql://localhost:3306/campus_share?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
DB_USERNAME=campus_user
DB_PASSWORD=replace-with-db-password
JWT_SECRET=replace-with-at-least-32-bytes-random-secret
JWT_ACCESS_EXPIRATION_MS=900000
JWT_REFRESH_EXPIRATION_MS=604800000
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CORS_ALLOWED_ORIGINS=https://your-frontend-domain.com
APP_ADMIN_EMAIL=admin@campus.edu
APP_ADMIN_PASSWORD=replace-with-strong-admin-password
MAIL_HOST=smtp.your-provider.com
MAIL_PORT=587
MAIL_USERNAME=your-smtp-username
MAIL_PASSWORD=your-smtp-password
MAIL_SMTP_AUTH=true
MAIL_SMTP_STARTTLS_ENABLE=true
MAIL_SMTP_CONNECTION_TIMEOUT=5000
MAIL_SMTP_TIMEOUT=5000
MAIL_SMTP_WRITE_TIMEOUT=5000
```

For a complete description of each variable, see `backend/ENVIRONMENT_VARIABLES.md`.

### Frontend

```bash
VITE_API_URL=https://your-api-domain.com/api
```

## 3. Database Setup

1. Create the MySQL database:

```sql
CREATE DATABASE campus_share CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Apply `database/schema.sql` using a migration tool or manual import.

3. Set Hibernate to validate schema only:

```properties
spring.jpa.hibernate.ddl-auto=validate
```

## 4. Backend Build and Run

```bash
cd backend
mvn clean package
java -jar target/campus-resource-sharing-backend-1.0.0.jar
```

For Docker-based deployment, build the JAR in CI and run it in a container with the environment variables above.

## 5. Frontend Build and Run

```bash
cd frontend
npm ci
npm run build
```

Deploy the `dist/` folder to:

- Netlify
- Vercel
- Nginx static hosting
- Any CDN-backed static host

## 6. Recommended Production Architecture

- Nginx or Apache as TLS terminator
- Spring Boot API behind reverse proxy
- React app served as static files
- MySQL managed service or hardened VM
- Cloudinary for all file storage

## 7. Security Checklist

- Use a 32+ byte random JWT secret
- Enforce HTTPS everywhere
- Restrict CORS to the frontend domain
- Keep `ddl-auto=validate` in production
- Rotate refresh tokens on every refresh
- Store only hashed refresh tokens in MySQL
- Limit admin accounts to known institutional users

## 8. Final Validation

Before handover, verify:

- Login and refresh token rotation
- Student verification workflow
- Product create/update/delete
- Notes upload/download
- Chat websocket messaging
- QR handover completion
- Admin moderation and analytics

## 9. CI/CD

The repository includes GitHub Actions workflows under `.github/workflows/`:

- `backend-ci.yml`
- `frontend-ci.yml`

### Triggers

Both workflows run on:

- Pull requests targeting `main`
- Pushes to `main`

### Backend Workflow

- Runs `mvn -B test`
- Builds the backend JAR with `mvn -B package -DskipTests`
- Uploads the JAR as the `backend-jar` artifact

### Frontend Workflow

- Runs `npm ci`
- Builds the frontend with `npm run build`
- Uploads the `dist/` directory as the `frontend-dist` artifact

### Notes

- Test failures fail the backend workflow immediately.
- Build failures fail the frontend workflow immediately.
- Artifacts are available from the workflow run page for release packaging or deployment.

## 10. Submission Notes

For final year submission and placement review, include:

- ER diagram
- Deployment guide
- API documentation
- Demo credentials for admin and student accounts
- Screenshots of marketplace, notes, chat, QR verification, and admin dashboard
