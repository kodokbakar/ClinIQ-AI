# ClinIQ AI Web

Next.js web app for ClinIQ AI.

## Stack

- Next.js 16
- React 19
- Tailwind CSS v4
- Vitest
- React Testing Library
- Bun workspace

## Development

Run from the repository root:

```bash
bun run dev
```

Or run only the web app:

```bash
cd apps/web
bun run dev
```

The web app runs on:

```text
http://localhost:3000
```

## Environment

Create `apps/web/.env.local` for local development:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

`NEXT_PUBLIC_API_URL` should point to the API server origin, without a trailing slash.

Examples:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_API_URL=https://api.cliniq.example.com
```

If `NEXT_PUBLIC_API_URL` is not set:

* development falls back to `http://localhost:8000`
* production uses same-origin `/api/...`

Production deployments should explicitly set `NEXT_PUBLIC_API_URL` unless the app is intentionally deployed behind a same-origin API proxy.

## Auth Routes

Current frontend routes:

* `/login`
* `/register`

Current backend login endpoint:

```text
POST /api/dashboard/auth/login
```

The register page currently targets:

```text
POST /api/dashboard/auth/register
```

The register backend endpoint still needs to be implemented before real registration can work outside tests.

## Checks

Run from the repository root:

```bash
bun run test
bun run lint
bun run check-types
bun run build
```

Run only the web app checks:

```bash
cd apps/web
bun run test
bun run lint
bun run check-types
bun run build
```