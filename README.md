# Campus Resource Sharing Platform

CampusShare is a production-focused campus marketplace and study-resource platform for verified students. It supports authentication, notes sharing, marketplace listings, orders, QR handover verification, notifications, admin workflows, real-time chat, activity tracking, recommendations, and a reputation system.

## Tech Stack

- Backend: Spring Boot, Spring Security, Spring Data JPA, JWT, WebSocket/STOMP, MySQL
- Frontend: React, Vite, Tailwind CSS, Axios
- Cloud: Cloudinary
- Deployment: Docker, Docker Compose, GitHub Actions, Render, Vercel

## Repository Structure

```text
backend/    Spring Boot API, domain, services, security, tests
frontend/   React app, pages, components, styling, API client
database/   Schema and ER diagram documentation
.github/    CI workflows for backend and frontend
```

## Features

- Authentication with refresh tokens
- Email verification and password reset
- Notes sharing with preview and download
- Marketplace listings with orders
- QR verification for handover completion
- Notifications and activity tracking
- Admin dashboard and moderation tools
- Real-time chat and presence
- Personalized dashboard and reputation system
- Responsive UI with production polish

## Architecture

- The backend exposes REST APIs and WebSocket endpoints.
- JWT access tokens secure authenticated requests.
- Refresh tokens are rotated and revoked server-side.
- Notes, products, orders, verifications, and reputation data are stored in MySQL.
- Cloudinary handles file uploads for media and document assets.
- The frontend consumes the API through a single Axios client and uses route-level code splitting for heavier pages.

## Screenshots

Screenshots are not bundled in this snapshot.
For a public GitHub release, add a small set of product screenshots under `docs/screenshots/` and reference them here.

## Local Development

### Prerequisites

- Java 21
- Node.js 20 or 22
- Maven
- MySQL 8

### Backend

1. Copy `backend/.env.example` to `backend/.env`.
2. Fill in database, JWT, Cloudinary, admin, and CORS values.
3. Run the backend from the `backend/` directory.

### Frontend

1. Copy `frontend/.env.example` to `frontend/.env.development`.
2. Set `VITE_API_URL` and `VITE_WS_URL` to your backend.
3. Run the frontend from the `frontend/` directory.

### Full Stack with Docker

```bash
docker compose up --build
```

The default ports are:

- Frontend: `http://localhost`
- Backend API: `http://localhost:8080`
- Swagger UI: `http://localhost:8080/swagger-ui/index.html`

## Configuration

- Backend environment variables: [backend/ENVIRONMENT_VARIABLES.md](backend/ENVIRONMENT_VARIABLES.md)
- Frontend example variables: [frontend/.env.example](frontend/.env.example)
- Production deployment guide: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

## Deployment

Deployment references are included for:

- Render backend deployment: [BACKEND_DEPLOYMENT_RENDER_RAILWAY.md](BACKEND_DEPLOYMENT_RENDER_RAILWAY.md)
- Managed MySQL setup: [DATABASE_DEPLOYMENT_MANAGED_MYSQL.md](DATABASE_DEPLOYMENT_MANAGED_MYSQL.md)
- Frontend deployment on Vercel: [FRONTEND_DEPLOYMENT_VERCEL.md](FRONTEND_DEPLOYMENT_VERCEL.md)

For production, ensure:

- `DDL_AUTO=validate`
- `CORS_ALLOWED_ORIGINS` only includes deployed frontend origins
- `JWT_SECRET` is long and random
- Cloudinary credentials are set in deployment secrets
- SMTP credentials are configured if email delivery is enabled

## API Highlights

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/products`
- `GET /api/notes`
- `GET /api/orders`
- `GET /api/dashboard/personalized`
- `GET /api/reputation/leaderboard`

The full API surface is documented in the backend controllers and Swagger UI.

## Testing

Run the required validation commands from the repository root:

```bash
mvn test
npm run build
```

If available, also run:

```bash
npm run lint
```

## Contributing

- Keep changes small and production-focused.
- Avoid introducing new features unless they are explicitly required.
- Do not commit secrets or environment-specific credentials.
- Preserve existing API contracts and business logic.
- Update tests and deployment docs when changing behavior.

## License

This project is released under the [MIT License](LICENSE).
