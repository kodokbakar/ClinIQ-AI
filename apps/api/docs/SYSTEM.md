# ClinIQ-AI - System Architecture & Design Document

This document consolidates the system architecture, technology stack, database design, API specification, and key operational rules for the **ClinIQ-AI** application.

**[Overview](#1-project-overview) · [Architecture Diagram](#11-architecture-diagram) · [Stack](#2-technology-stack) · [ERD](erd.md) · [API](api-endpoints.md) · [AI Rules](rules-ai.md) · [Config](CONFIG.md) · [Glossary](GLOSSARY.md)**

---

## 1. Project Overview

**ClinIQ-AI** is a web-based gamified medical education game targeting Gen Z in Indonesia. It transforms clinical reasoning practice into a daily puzzle format inspired by Wordle, where players diagnose diseases from progressive clinical vignettes (5 clues max).

**Core Value Proposition:**
- Productive screen time alternative
- Medical literacy via competitive, social gameplay
- Localized AI explanations ("kearifan lokal")
- High replayability through unique case variants
- Cost-efficient AI usage via aggressive caching

---

## 1.1 Architecture Diagram

```
┌─────────────┐     ┌──────────────────────────────────┐     ┌──────────────┐
│   Frontend  │────▶│          Backend (Bun)            │────▶│  PostgreSQL  │
│  (TBD:      │     │  ┌────────────────────────────┐  │     │  (SOT)       │
│   React/    │     │  │  API Router (/v1/*)        │  │     │              │
│   Next.js)  │     │  │  • Auth (JWT)              │  │     │  Users       │
│             │     │  │  • Quiz Engine             │  │     │  Diseases    │
│  EMR-like   │     │  │  • Group Manager           │  │     │  Vignettes   │
│  UI         │     │  │  • Leaderboard Aggregator  │  │     │  Clues       │
│             │     │  │  • AI Orchestrator         │  │     │  Attempts    │
│             │     │  └────────────────────────────┘  │     │  AI_Cache    │
│             │     │  ┌────────────────────────────┐  │     │  Groups      │
│             │     │  │  AI Client (OpenAI-compat) │──┼──▶  └──────────────┘
│             │     │  └────────────────────────────┘  │
│             │     └──────────────────────────────────┘          ┌────────┐
│             │           │                                       │  Redis │
│             │           └──────────────────────────────────────▶│        │
│             │                 S3 (avatars/media)                │  LB    │
└─────────────┘                                                   └────────┘
```

**Data Flow:**
1. **Player guesses** → Backend validates vs `Clues.vignette_id` → Returns score
2. **Player fails** → AI Orchestrator checks `AI_Explanations` cache → Miss → Calls 9Router → Stores result → Returns explanation
3. **Leaderboard** → Score updated in Redis Sorted Set (`leaderboard:global` / `leaderboard:group:<id>`)
4. **Daily quiz** → Backend assigns an unplayed vignette variant per `(user_id, vignette_id)` unique constraint

---

## 2. Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | (TBD - React/Next.js likely) | Responsive EMR-like UI |
| **Backend** | Node.js / TypeScript (Bun runtime) | API, game logic, AI orchestration |
| **Database** | PostgreSQL | Source of Truth (users, diseases, vignettes, attempts, groups, AI cache) |
| **Cache/Leaderboard** | Redis (Sorted Sets) | Real-time global & group leaderboards |
| **AI Provider** | 9Router / OpenAI-compatible API | Localized disease explanations, vignette generation |
| **Storage** | AWS S3 (or compatible) | Avatars, media assets |
| **Auth** | JWT (HS256 or RS256 via config) | Stateless authentication |

**Auth Note:** JWT algorithm is configurable via `JWT_ALGORITHM` in env. Default = `HS256`. Use `RS256` in multi-service deployments where a public/private key pair allows services to verify tokens without sharing a secret. See [CONFIG.md](CONFIG.md) for details.

---

## 3. Database Design (ERD Summary)

See [erd.md](erd.md) for full schema, constraints, indexes, and FK actions.

### Core Entities (8 tables)

1. **Users** — Authentication, profile, cached `total_score`
2. **Diseases** — WHO ICD-sourced disease master data (`icd_code` unique)
3. **QuizVignettes** — Clinical case variants per disease (`variant_name` + `disease_id` unique)
4. **Clues** — Exactly 5 clues per vignette (`clue_number` 1-5, `type` categorical)
5. **QuizAttempts** — User's play record per vignette (score, clues_revealed, correctness)
6. **AI_Explanations** — Cached AI explanations per `(disease_id, locale_context)` — **1:M** with Diseases
7. **Groups** — Social circles (max 5 members, owner_id FK)
8. **GroupMembers** — Join table for user↔group many-to-many

### Key Constraints & Indexes
- Unique: `Users.email`, `Users.username`, `Diseases.icd_code`
- Unique: `QuizVignettes(disease_id, variant_name)`, `Clues(vignette_id, clue_number)`
- Unique: `QuizAttempts(user_id, vignette_id)` — enforces daily uniqueness
- Unique: `AI_Explanations(disease_id, locale_context)`
- Unique: `GroupMembers(group_id, user_id)`
- Indexes on all FKs + frequently queried columns

### Redis Structures
- `leaderboard:global` — Sorted Set: `score → user_id`
- `leaderboard:group:<group_id>` — Sorted Set: `score → user_id`
- Updated async/transactionally from `QuizAttempts`

---

## 4. API Specification (v1)

All endpoints prefixed with `/v1/`. Auth via `Authorization: Bearer ***`. See [api-endpoints.md](api-endpoints.md) for full request/response contracts.

### Auth & Users
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | No | Register new user |
| POST | `/auth/login` | No | Login, returns JWT |
| GET | `/users/me` | User | Current user profile + groups |
| PATCH | `/users/me` | User | Update username only (avatar system-generated) |
| GET | `/users/:id` | No | Public profile for group members |
| POST | `/users/me/change-password` | User | Change password |

### Quiz & Gameplay
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/quiz/daily` | User | Get today's vignette (UTC day); returns existing attempt if in progress |
| POST | `/quiz/reveal-clue` | User | Reveal next clue for `attempt_id` |
| POST | `/quiz/submit-diagnosis` | User | Submit guess for `attempt_id`; returns score, correctness, AI explanation if wrong |
| GET | `/quiz/attempts/me` | User | Paginated history of user's attempts |
| GET | `/quiz/:vignette_id/explanation` | User | Get cached/generated AI explanation for disease |

### Groups (max 5 members)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/groups` | User | Create group (user becomes owner) |
| GET | `/groups/me` | User | List user's groups |
| GET | `/groups/:id` | Member | Group details + members + inline leaderboard |
| POST | `/groups/:id/join` | User | Join group (enforces max 5) |
| DELETE | `/groups/:id/leave` | User | Leave group (owner must transfer first) |
| DELETE | `/groups/:id` | Owner | Delete group (owner only) |

### Leaderboards
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/leaderboards/global` | No | Global top scores |
| GET | `/leaderboards/groups/:group_id` | Member | Group member scores |

### Admin (RBAC)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/admin/diseases/upload-icd` | Admin | Upload WHO ICD Excel/CSV → chunk → seed Diseases |
| POST | `/admin/vignettes/generate` | Admin | Trigger AI vignette generation for a disease |

**Auth Levels:**
- `No` — Public, no authentication required
- `User` — Any authenticated user
- `Member` — Must be authenticated + a member of the group
- `Owner` — Must be authenticated + the group owner
- `Admin` — Must be authenticated with admin role (RBAC)

---

## 5. AI Interaction Rules

See [rules-ai.md](rules-ai.md) for full AI behavior rules including prompt templates.

### Explanation Generation (User-Facing)
- **Trigger:** User fails quiz or reveals all 5 clues
- **Localization:** Indonesian cultural context (`locale_context`: `INDONESIA_GENERAL`, `INDONESIA_JAJAN`, `INDONESIA_TELAT_MAKAN`, `INDONESIA_TRADITIONAL_MEDICINE`)
- **Cache-First:** Check `AI_Explanations(disease_id, locale_context)` before calling external API
- **Zero-Token:** Cache hit = 0 external tokens; cache miss → generate → store → return
- **Idempotent:** Unique constraint `(disease_id, locale_context)` prevents duplicates

### Vignette Generation (Admin/System)
- **On-Demand:** Only when pool exhausted for a user or admin triggers
- **Variety:** Each disease needs many `variant_name` entries
- **Idempotent:** Unique constraint `(disease_id, variant_name)` prevents duplicate cases
- **Structure:** 5 progressive clues per vignette (demographic → lab → epidemiology)

---

## 6. System Constraints & Optimizations

| Constraint | Implementation |
|------------|----------------|
| **No N+1 Queries** | Eager loading (JOINs) + Data Batching (WHERE IN / DataLoader pattern) for relations: disease→vignettes→clues, group→members |
| **AI Cost Control** | Lazy-load (on-demand only); aggressive DB caching; idempotent generation blocks duplicates |
| **Leaderboard Speed** | Redis Sorted Sets O(log N) inserts/reads; PostgreSQL only for persistence |
| **Daily Quiz Uniqueness** | `QuizAttempts(user_id, vignette_id)` unique + UTC day boundary + assignment algorithm picks unattempted variant |
| **Group Capacity** | Hard limit 5 enforced at API + DB (`member_count` cached on Groups) |

---

## 7. Environment Configuration

Refer to [CONFIG.md](CONFIG.md) for the complete list of environment variables with descriptions and defaults.

---

## 8. Success Metrics (KPIs)

- **Quiz Completion Rate** — % of started daily quizzes finished
- **Group Participation** — % of users in at least one group
- **Server Efficiency** — Zero N+1 query incidents; leaderboard p99 < 50ms
- **Cost Savings** — AI token spend → $0 for cached diseases; target >90% cache hit rate after warmup

---

## 9. Related Documentation

| File | Purpose |
|------|---------|
| `project-description.md` | Original product brief (Indonesian) |
| `erd.md` | Full ERD with columns, constraints, indexes |
| `api-endpoints.md` | Detailed request/response contracts for `/v1/` API |
| `rules-ai.md` | AI behavior rules (explanation & vignette generation) + prompt examples |
| `CONFIG.md` | Consolidated environment variable reference |
| `GLOSSARY.md` | Project terminology definitions |
| `SYSTEM.md` | **This file** — consolidated architecture reference |
| `9router-integration.md` | Guide for connecting to 9Router API |

---

## 10. Future Considerations

- **API Versioning:** `/v2/` when breaking changes needed
- **Refresh Tokens:** For longer sessions / mobile
- **WebSocket/Server-Sent Events:** Real-time leaderboard updates (optional)
- **Multi-language:** Extend `locale_context` beyond Indonesian
- **Tournament Mode:** Time-limited group competitions
- **Admin Dashboard:** UI for ICD uploads, vignette review, AI prompt tuning
