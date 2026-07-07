# ClinIQ-AI API — Build Plan

Sequenced build phases for the ClinIQ-AI backend API based on your actual project state at `apps/api/`.

**Stack:** Express.js · Sequelize · PostgreSQL · Bun · Turborepo  
**Docs:** [CONFIG.md](CONFIG.md) · [SYSTEM.md](SYSTEM.md) · [erd.md](erd.md) · [api-endpoints.md](api-endpoints.md)

---

## ✅ Phase 0 — Already Built (Auth & Skeleton)

These are done and don't need rework:

| # | Item | Status |
|---|------|--------|
| 1 | Express server, CORS, morgan, cookie-parser, body parsing | ✅ |
| 2 | Sequelize + PostgreSQL connection (config/config.js) | ✅ |
| 3 | Roles migration + Role model | ✅ |
| 4 | Users migration (uuid PK, name, email, password, role_id FK, status, avatar, timestamps, paranoid) | ✅ |
| 5 | User model (belongsTo Role) | ✅ |
| 6 | Seeds: Superadmin, Admin, User roles + 3 demo users | ✅ |
| 7 | JWT utils (generateToken, verifyToken, decodeToken) | ✅ |
| 8 | bcrypt utils (hashPassword, compare) | ✅ |
| 9 | Auth middleware — cookie-based JWT verify, user lookup, status check | ✅ |
| 10 | Zod validation (validateRequest, validationFiles) | ✅ |
| 11 | API response formatter (api.results with pagination, error mapping for Sequelize/Zod) | ✅ |
| 12 | S3 client (uploadFile, getFile, deleteFile) | ✅ |
| 13 | `POST /api/dashboard/auth` (register) | ✅ |
| 14 | `POST /api/dashboard/auth/login` (cookie-based JWT) | ✅ |
| 15 | `POST /api/dashboard/auth/logout` (clear cookie) | ✅ |
| 16 | `PUT /api/dashboard/auth/change-password` (needs current_password) | ✅ |
| 17 | `GET /api/dashboard/auth/me` (profile + role lookup) | ✅ |
| 18 | Dashboard users CRUD (`GET/POST/PUT/DELETE /api/dashboard/user/:user_id`) | ✅ |
| 19 | Reset password, user access management | ✅ |

**Current route structure** (routes.js):
```
/api/status                               → "Running ⚡"
/api/dashboard/auth/*                      → register, login, logout, change-password, me
/api/dashboard/user/* (auth required)      → list, create, show, update, delete, reset-password, access
/api/dashboard/master/* (auth required)    → placeholder
```

---

## Phase 1 — Repath Routes to `/v1/`

**Goal:** Align the route structure with the documented `/v1/` API contract. Move auth endpoints from `/api/dashboard/auth` to `/v1/auth/` and user endpoints to `/v1/users/`. Keep existing controllers — just repath.

```
 1. Create src/routes/v1/ folder
 2. Move auth routes to /v1/auth/register, /v1/auth/login, /v1/auth/me, /v1/auth/change-password
 3. Move user routes to /v1/users/me, /v1/users/:id
 4. Keep old /api/dashboard/* paths for admin dashboard UI (don't break compat)
 5. Add Authorization: Bearer support to auth middleware (currently only reads cookies)
 6. Test: both cookie and Bearer token auth work
```

---

## Phase 2 — Disease & Quiz Database Tables

**Goal:** Create the remaining 6 tables via Sequelize migrations.

```
 7. Migration: Diseases
    - id (UUID PK), icd_code (STRING unique), name (STRING), description (TEXT), timestamps
 8. Migration: QuizVignettes
    - id (UUID PK), disease_id (FK→Diseases), variant_name (STRING)
    - UNIQUE (disease_id, variant_name)
 9. Migration: Clues
    - id (UUID PK), vignette_id (FK→QuizVignettes), clue_number (INTEGER CHECK 1-5)
    - content (TEXT), type (STRING nullable)
    - UNIQUE (vignette_id, clue_number)
10. Migration: QuizAttempts
    - id (UUID PK), user_id (FK→Users), vignette_id (FK→QuizVignettes)
    - is_correct (BOOLEAN), submitted_diagnosis (STRING nullable)
    - clues_revealed (INTEGER CHECK 1-5), score (INTEGER)
    - attempt_time (DATE), timestamps
    - UNIQUE (user_id, vignette_id)
11. Migration: AI_Explanations
    - id (UUID PK), disease_id (FK→Diseases), explanation_text (TEXT)
    - locale_context (STRING), ai_model_used (STRING nullable), timestamps
    - UNIQUE (disease_id, locale_context)
12. Migration: Groups + GroupMembers
    - Groups: id (UUID PK), name, description, owner_id (FK→Users), member_count (INTEGER DEFAULT 1)
    - GroupMembers: id (UUID PK), group_id (FK→Groups), user_id (FK→Users), joined_at, is_admin
    - UNIQUE (group_id, user_id)
13. Migration: Enable pg_trgm extension
14. Migration: Add GIN index on Diseases.name using pg_trgm
15. Create Sequelize models for all 6 new tables with associations
16. Seed: Insert 25-30 real WHO ICD diseases (icd_code + name)
```

**FK cascade rules** (via migration `references` options):
- QuizVignettes → Diseases: `CASCADE`
- Clues → QuizVignettes: `CASCADE`
- QuizAttempts → Users: `CASCADE`
- QuizAttempts → QuizVignettes: `RESTRICT`
- AI_Explanations → Diseases: `CASCADE`
- Groups → Users (owner): `RESTRICT`
- GroupMembers → Groups: `CASCADE`
- GroupMembers → Users: `CASCADE`

---

## Phase 3 — Disease Search & Quiz Core

**Goal:** Autocomplete disease search, daily quiz assignment, progressive clue reveal, diagnosis scoring.

```
17. GET /v1/diseases/search?q=
    - Validate q.length >= 2
    - ILIKE prefix search on Diseases.name
    - LIMIT default 10, max 25
18. Scoring formula constants in utils/quiz.js:
    - clues 1 → 500, 2 → 400, 3 → 300, 4 → 200, 5 → 100
    - wrong → 0
19. GET /v1/quiz/daily (auth)
    - Determine UTC day, check existing QuizAttempt for today
    - If none: pick unattempted QuizVignette via WHERE NOT EXISTS
    - Create attempt (clues_revealed=0), return first clue
20. POST /v1/quiz/reveal-clue (auth)
    - Increment clues_revealed, return next clue content
    - 400 if already at 5
21. POST /v1/quiz/submit-diagnosis (auth)
    - Case-insensitive compare diagnosis_text vs disease.name
    - Set is_correct, score
    - If wrong OR 5 clues → trigger AI explanation (Phase 5)
    - Return { is_correct, correct_disease_name, score, explanation? }
22. GET /v1/quiz/attempts/me (auth, paginated)
    - Query params: limit (10), offset (0)
    - Join disease_name for display
```

---

## Phase 4 — Redis Leaderboards

**Goal:** Global + group leaderboards via Redis Sorted Sets.

```
23. Install: bun add ioredis
24. Create src/utils/redis.js — singleton Redis client from REDIS_URL
25. On correct quiz submit:
    - ZINCRBY leaderboard:global <score> <user_id>
    - For each group user belongs to: ZINCRBY leaderboard:group:<group_id> <score> <user_id>
26. GET /v1/leaderboards/global (public, paginated)
    - ZREVRANGE ... WITHSCORES, hydrate user details via batch SQL SELECT ... WHERE id IN (...)
    - Fallback to PostgreSQL if Redis down
27. GET /v1/leaderboards/groups/:group_id (auth + member check)
    - Same pattern, scoped to group Sorted Set
```

---

## Phase 5 — AI Explanation Generation

**Goal:** Generate and cache localized AI explanations via 9Router.

```
28. Install: bun add openai
29. Create src/services/ai.js — init OpenAI client from env vars
    - baseURL = AI_BASE_URL, apiKey = AI_API_KEY
30. getOrGenerateExplanation(diseaseId, diseaseName, localeContext, clues[])
    - Check AI_Explanations cache → return if exists
    - Call 9Router with system prompt from rules-ai.md §1
    - INSERT into AI_Explanations, return explanation_text
31. Hook into POST /v1/quiz/submit-diagnosis:
    - If wrong OR clues === 5 → call getOrGenerateExplanation, include in response
32. GET /v1/quiz/:vignette_id/explanation (auth)
    - Resolve vignette_id → disease_id, return cached or generate fresh
33. Error handling:
    - API timeout → fallback message, do NOT cache empty result
    - API 401 → log warning, return fallback
```

---

## Phase 6 — Groups

**Goal:** Group CRUD, membership, inline leaderboard.

```
34. POST /v1/groups (auth) — create, owner=self, insert GroupMembers
35. GET /v1/groups/me (auth) — list user's groups
36. GET /v1/groups/:id (auth + member check) — details + members + leaderboard from Redis
37. POST /v1/groups/:id/join (auth) — enforce max 5, create Redis Sorted Set key if new
38. DELETE /v1/groups/:id/leave (auth) — owner can't leave (must transfer)
39. DELETE /v1/groups/:id (auth + owner only) — cascade delete members + Redis DEL
```

---

## Phase 7 — Admin Endpoints

**Goal:** ICD upload, AI vignette generation, RBAC middleware.

```
40. RBAC middleware — check user has admin/superadmin role
41. POST /v1/admin/diseases/upload-icd (admin) — parse Excel/CSV → batch INSERT INTO Diseases
42. POST /v1/admin/vignettes/generate (admin) — trigger AI to generate QuizVignette + 5 Clues
    - Uses prompt template from rules-ai.md §2
    - Runs async, returns 202
```

---

## Phase 8 — Security & Hardening

**Goal:** Rate limiting, input validation everywhere, CORS tightened, logging.

```
43. Rate limiting (bun memory-store or express-rate-limit):
    - 100 req/min public endpoints per IP
    - 30 req/min auth endpoints per user
    - 10 clue reveals/min per user
44. Input validation — zod schemas for EVERY endpoint (not just auth)
45. CORS — restrict ALLOWED_ORIGINS in non-local env
46. Global error handler — catch-all, standard JSON shape
47. Request ID middleware — X-Request-Id header for tracing
48. Logging — pino or morgan to structured JSON
49. Security headers — helmet-style (X-Content-Type-Options, X-Frame-Options, HSTS)
```

---

## Phase 9 — Testing

**Goal:** Integration tests covering all endpoints.

```
50. Install: bun add -d vitest supertest
51. Test helpers:
    - Create app instance without listener
    - Run migrations on test DB (separate DB name)
    - Seed minimal test data
52. Auth tests: register → login → me → change-password → duplicate (409)
53. Disease search tests: prefix match, no-match, short query edge case
54. Quiz tests: daily → reveal → submit correct/wrong → history
55. Group tests: create → join → leave → delete → max members (5) enforcement
56. Leaderboard tests: submit answer → check ranking
57. Admin tests: non-admin gets 403, ICD upload, vignette gen
58. Edge cases: expired token, max clues revealed, double submit, group full
```

---

## Phase 10 — Polish & DX

**Goal:** Dev scripts, Docker, docs sync.

```
59. bun run db:reset — drop → create → migrate → seed (one command)
60. bun run test — runs all integration tests
61. Postman/Thunder client collection export
62. Sync docs/build-plan.md with actual implementation state
63. Dockerfile + docker-compose.yml (postgres + redis + api)
64. .env.example in repo root
65. Healthcheck endpoint: report DB + Redis + AI provider status
```

---

## Summary

```
Before (Phase 0 completed):   Auth + Users CRUD + DB skeleton + S3
├─ Phase 1: Paths to /v1/      (1 file change, no new logic)
├─ Phase 2: 6 new tables       (migrations + models)
├─ Phase 3: Quiz engine        (disease search + daily quiz + scoring)
├─ Phase 4: Redis leaderboards (2 endpoints)
├─ Phase 5: AI explanations    (9Router integration)
├─ Phase 6: Groups             (CRUD + membership)
├─ Phase 7: Admin              (ICD upload + vignette gen)
├─ Phase 8: Security           (rate limit + validation + CORS)
├─ Phase 9: Tests              (vitest + supertest)
└─ Phase 10: Polish            (Docker + docs)
```

**Parallelization:**
- Phase 1 is standalone — do it now (quick win)
- Phase 2 blocks Phase 3-7
- Phase 3-6 can be built in parallel after Phase 2
- Phase 8-9 can start mid-way through Phase 4
- Phase 10 is last
