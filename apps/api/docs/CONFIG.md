# CONFIG.md

This file consolidates all environment configuration variables used across the project.

## 1. Runtime & General
- `NODE_ENV`: Runtime environment (`local`, `staging`, `production`).
- `ALLOWED_ORIGINS`: CORS whitelist (use `*` for local dev, restrict in prod).

## 2. AI / LLM (OpenAI-Compatible)
These variables configure connection to the 9Router or OpenAI-compatible provider.
- `AI_BASE_URL`: Base URL of the API (e.g., `http://localhost:20128/v1`).
- `AI_API_KEY`: API authentication key.
- `AI_MODEL`: Model identifier (e.g., `gpt-3.5-turbo`).
- `AI_CHAT_COMPLETIONS_PATH`: Path for chat completions (e.g., `/chat/completions`).
- `AI_PROVIDER_NAME`: Name of the provider (e.g., `9Router`).
- `AI_REQUEST_TIMEOUT_MS`: Request timeout in milliseconds (default `60000`).

## 3. PostgreSQL Database (Source of Truth)
- `DB_USER`: Database username.
- `DB_PASS`: Database password.
- `DB_NAME`: Database name (`doctordle_db`).
- `DB_HOST`: Host address.
- `DB_PORT`: Database port (`5432`).
- `DB_CONNECTION`: Connection driver (`postgres`).
- `DB_SSL`: Enable SSL (`true` or `false`).

## 4. Redis (Cache & Leaderboards)
- `REDIS_URL`: Redis connection URL (e.g., `redis://localhost:6379`).

## 5. AWS S3 (Media Storage)
- `AWS_ACCESS_KEY_ID`: Access key.
- `AWS_SECRET_ACCESS_KEY`: Secret key.
- `AWS_DEFAULT_REGION`: AWS region.
- `AWS_BUCKET`: Storage bucket name.
- `AWS_USE_PATH_STYLE_ENDPOINT`: Path style enabled/disabled.
- `AWS_ENDPOINT`: Endpoint URL.

## 6. Authentication
- `JWT_KEY`: Secret key for JWT signing.
