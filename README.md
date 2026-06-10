# Campus Resource Sharing Platform

A college-only marketplace for verified students to sell, rent, exchange, and share campus resources.

## Structure

```text
backend/    Spring Boot 3, Java 21, JWT, JPA, WebSocket, Cloudinary
frontend/   React 19, Vite, React Router, Tailwind CSS, Axios
database/   MySQL 8 schema and ER diagram description
```

## Run locally

1. Start MySQL:
   ```bash
   docker compose up -d
   ```
2. Copy `backend/.env.example` to `backend/.env`, then set the database, JWT, Cloudinary, and admin values before starting the API.
3. Start the API:
   ```bash
   cd backend
   mvn spring-boot:run
   ```
4. Start the web app:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

The frontend runs at `http://localhost:5173`, the API at `http://localhost:8080`, and Swagger UI at `http://localhost:8080/swagger-ui/index.html`.

The development admin account is configured through `APP_ADMIN_EMAIL` and `APP_ADMIN_PASSWORD`.
The backend environment variable reference lives in `backend/ENVIRONMENT_VARIABLES.md`.

The normalized database design is documented in `database/schema.sql` and `database/ER_DIAGRAM.md`.
The production deployment checklist lives in `DEPLOYMENT_GUIDE.md`.

## Authentication API

- `POST /api/auth/register` creates a student account and returns access and refresh tokens.
- `POST /api/auth/login` authenticates with email and password.
- `POST /api/auth/refresh` rotates a valid refresh token and returns a new token pair.
- `POST /api/auth/logout` revokes a refresh token.

Access tokens default to 15 minutes and refresh tokens default to 7 days. Configure them with
`JWT_ACCESS_EXPIRATION_MS` and `JWT_REFRESH_EXPIRATION_MS`.

## Marketplace API

- `GET /api/products` searches active products with pagination and optional `q`, `categoryId`,
  `minPrice`, `maxPrice`, `condition`, and `type` filters.
- `GET /api/products/{productId}` returns a product with ordered images.
- `GET /api/products/mine` returns the authenticated seller's products.
- `POST /api/products`, `PUT /api/products/{productId}`, and `DELETE /api/products/{productId}`
  create, edit, and soft-delete products.
- `POST /api/products/images` uploads 1 to 10 product images.
- `GET /api/categories` lists categories; `POST /api/categories` requires the `ADMIN` role.

## Production notes

- Set `DDL_AUTO=validate` and apply `database/schema.sql` through a migration tool.
- Use a long random `JWT_SECRET`, HTTPS, restricted CORS origins, and managed secrets.
- Set `CORS_ALLOWED_ORIGINS` to the deployed frontend URL in production.
- Configure Cloudinary upload presets and moderation rules.
- Provision SMTP credentials if you enable backend email delivery.
- Replace the in-memory WebSocket broker with a broker relay when scaling horizontally.
- Add institution-specific email or SSO verification before enabling student accounts.
