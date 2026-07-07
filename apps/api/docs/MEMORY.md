# ClinIQ-AI - Project Memory & Knowledge Base

A living document capturing durable, project-specific knowledge, recurring patterns, known issues, and operational notes not covered by formal specs.

**[SYSTEM.md](SYSTEM.md) · [CONFIG.md](CONFIG.md) · [GLOSSARY.md](GLOSSARY.md)**

---

## 1. Architectural Decisions

| Decision | Rationale | Date |
|----------|-----------|------|
| **AI explanation caching via DB unique constraint** | Zero-token architecture — once generated for `(disease_id, locale_context)`, never regenerated. Unique constraint prevents duplicate cache entries at DB level, not app code level. | Initial |
| **Redis for leaderboards only, not session cache** | Leaderboard reads are hot path (every page load). Score updates are infrequent (once per quiz). Redis Sorted Sets give O(log N) for both. PostgreSQL remains SOT for everything else. | Initial |
| **`pg_trgm` prefix search for disease autocomplete** | Frontend needs real-time suggestions as user types (no Enter key). GIN trigram index on `diseases.name` supports fast `ILIKE 'prefix%'` / `ILIKE '%term%'`. | Initial |
| **JWT without refresh tokens (v1)** | Simpler initial implementation. Refresh tokens planned for v2 when mobile clients are added. | Initial |

---

## 2. Development Environment

### PostgreSQL Setup
```bash
# Create database
createdb doctordle_db

# Enable pg_trgm extension (required for disease search)
psql -d doctordle_db -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
```

### Redis Setup
```bash
# Verify Redis is running
redis-cli ping
# Should return: PONG
```

### Migrations
- Use Sequelize migrations for schema changes
- Always add both `up` and `down` migration
- Test rollback before pushing

---

## 3. Known Issues & Workarounds

### `pg_trgm` index not used for very short search terms
- **Symptom:** Autocomplete slow for 1-char queries
- **Root cause:** `pg_trgm` needs minimum 3 characters for trigram matching
- **Workaround:** Backend should enforce `q.length >= 2` before hitting the DB; return empty array for single char
- **Fix:** Long-term — add a `pg_trgm.word_similarity` fallback or a simpler `LEFT(name, 1)` btree index for single-char prefix lookups

### Sequelize eager loading with nested includes can generate N+1
- **Symptom:** Loading `Group → Members → Users` generates N queries for N members
- **Root cause:** Sequelize `include` for one-to-many nested through a join table sometimes defers loading
- **Workaround:** Use `include: [{ model: GroupMember, include: [User] }]` with `separate: true` only when absolutely needed; prefer raw JOIN queries for performance-critical paths
- **Fix:** See [SYSTEM.md](SYSTEM.md#6-system-constraints--optimizations) — DataLoader pattern or `WHERE IN` batching

### 9Router timeout on cold start
- **Symptom:** First AI request of the day fails with timeout
- **Root cause:** 9Router's model takes 30-60s to load on first inference (cold start)
- **Workaround:** Set `AI_REQUEST_TIMEOUT_MS=120000` in env; or configure 9Router to keep model warm
- **Fix:** Consider a health-check cron that pings the AI endpoint every 5 min during business hours

---

## 4. Performance Notes

### Leaderboard query pattern
- **Do NOT:** `SELECT * FROM users ORDER BY total_score DESC` — full table scan on large user base
- **DO:** Read from Redis `ZREVRANGE leaderboard:global 0 9` for top 10, then hydrate user details with `SELECT ... WHERE id IN (...)` (2 queries, not 1+N)

### Disease search response time target
- Target: `< 50ms` for 3+ char queries
- Use `EXPLAIN ANALYZE` to verify `pg_trgm` index is hit
- If `pg_trgm` doesn't cover the query path, consider `CREATE INDEX idx_diseases_name_left ON diseases (LEFT(name, 10))` for prefix-only searches

---

## 5. Useful Commands

```bash
# Reset local DB
bun run db:drop && bun run db:create && bun run db:migrate && bun run db:seed

# Check Redis leaderboard contents
redis-cli ZREVRANGE leaderboard:global 0 -1 WITHSCORES

# Verify AI explanation cache
psql -d doctordle_db -c "SELECT COUNT(*) FROM ai_explanations;"

# Trigger vignette generation (via API)
curl -X POST http://localhost:20128/v1/admin/vignettes/generate \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"disease_id":"<uuid>","count":5}'
```

---

## 6. Contribution

- Add entries here when you solve a non-obvious problem
- Reference other docs (SYSTEM.md, erd.md, etc.) instead of duplicating content
- Mark workarounds with the expected fix date or version number if known
