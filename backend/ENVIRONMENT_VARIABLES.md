# Backend Environment Variables

The backend reads environment variables directly and, for local development, also imports `backend/.env` if present.
Use `backend/.env.example` as the starting point for local setup.

## Required

- `DB_URL`: JDBC connection string for MySQL.
- `DB_USERNAME`: MySQL username.
- `DB_PASSWORD`: MySQL password.
- `JWT_SECRET`: HMAC signing secret used for JWTs and QR token signing.
- `CLOUDINARY_CLOUD_NAME`: Cloudinary cloud name.
- `CLOUDINARY_API_KEY`: Cloudinary API key.
- `CLOUDINARY_API_SECRET`: Cloudinary API secret.
- `APP_ADMIN_EMAIL`: Bootstrap admin account email.
- `APP_ADMIN_PASSWORD`: Bootstrap admin account password.

## Recommended

- `SERVER_PORT`: HTTP port for the API. Default: `8080`.
- `DDL_AUTO`: Hibernate schema mode. Default: `update` locally, `validate` in production.
- `JWT_ACCESS_EXPIRATION_MS`: Access token lifetime in milliseconds. Default: `900000`.
- `JWT_REFRESH_EXPIRATION_MS`: Refresh token lifetime in milliseconds. Default: `604800000`.
- `CORS_ALLOWED_ORIGINS`: Comma-separated allowed frontend origins.

## Email / SMTP

These values are prepared for SMTP-backed email delivery. They are safe to leave blank until email sending is enabled.

- `MAIL_HOST`: SMTP host.
- `MAIL_PORT`: SMTP port. Default: `587`.
- `MAIL_USERNAME`: SMTP username.
- `MAIL_PASSWORD`: SMTP password.
- `MAIL_SMTP_AUTH`: Whether SMTP authentication is enabled. Default: `true`.
- `MAIL_SMTP_STARTTLS_ENABLE`: Whether STARTTLS is enabled. Default: `true`.
- `MAIL_SMTP_CONNECTION_TIMEOUT`: SMTP connection timeout in milliseconds. Default: `5000`.
- `MAIL_SMTP_TIMEOUT`: SMTP read timeout in milliseconds. Default: `5000`.
- `MAIL_SMTP_WRITE_TIMEOUT`: SMTP write timeout in milliseconds. Default: `5000`.

## Production Notes

- Keep `DDL_AUTO=validate` in production.
- Use a long, random `JWT_SECRET` with at least 32 bytes.
- Set `CORS_ALLOWED_ORIGINS` to the deployed frontend URL only.
- Store the real values in your deployment platform's secret manager or environment settings.
