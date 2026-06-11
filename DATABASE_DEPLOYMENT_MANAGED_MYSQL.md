# Database Deployment Guide: Managed MySQL

This guide covers using a managed MySQL database for production.

## 1. Recommended Setup

Use a managed MySQL service from your hosting provider or cloud vendor instead of a self-hosted database for production.

Examples:

- Render MySQL
- Railway MySQL
- AWS RDS
- Google Cloud SQL
- Azure Database for MySQL

## 2. Schema Initialization

Initialize the schema using the repository SQL scripts or your preferred migration process.

Recommended flow:

1. Create the database with UTF-8 support.
2. Apply the schema from the repository.
3. Point the backend `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD` at the managed instance.
4. Keep `DDL_AUTO=validate` in production so Hibernate checks the schema instead of changing it.

## 3. Connection String Guidance

Use a production JDBC URL similar to:

```bash
jdbc:mysql://your-managed-mysql-host:3306/campus_share?useSSL=true&requireSSL=true&serverTimezone=UTC
```

Adjust the SSL flags to match your provider's recommended settings.

## 4. Backup Strategy

Use both automated and manual backups.

- Automated backups:
  - Enable daily automated snapshots if the provider supports them.
  - Keep at least 7 to 30 days of retention.
- Manual backups:
  - Export logical backups before schema migrations or major releases.
  - Store backup files in secure object storage with restricted access.
- Restore testing:
  - Periodically test restoring a backup into a staging database.

## 5. Rollback Strategy

If a release causes issues:

1. Revert the backend deployment to the previous release artifact or container image.
2. Roll the frontend back to the previous Vercel deployment.
3. Restore the database only if the schema change is not forward-compatible.
4. Prefer additive schema changes so application rollbacks do not require data loss.

## 6. Database Checklist

- Managed MySQL is reachable from the backend host
- TLS/SSL is enabled where supported
- Backups are configured and retention is documented
- Backup restores have been tested
- The backend is using `DDL_AUTO=validate`
- Connection credentials are stored only in environment variables

