# Makefile
.PHONY: up down restart reset ps logs api migrate seed undo lint health

up:
	docker compose up -d postgres redis

down:
	docker compose down

restart:
	docker compose restart postgres redis

reset:
	docker compose down -v
	docker compose up -d postgres redis

ps:
	docker compose ps

logs:
	docker compose logs -f postgres redis

api:
	cd apps/api && bun run dev

migrate:
	cd apps/api && bun run migrate

seed:
	cd apps/api && bun run seed

undo:
	cd apps/api && bun run undo

lint:
	cd apps/api && bun run lint

health:
	curl -i http://localhost:8000/health