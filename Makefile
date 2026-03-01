.PHONY: dev test seed migrate api web

# Start all services
dev:
	docker compose up -d

# Stop all services
down:
	docker compose down

# Run API server locally
api:
	cd apps/api && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run database migrations
migrate:
	cd apps/api && alembic upgrade head

# Generate a new migration
migration:
	cd apps/api && alembic revision --autogenerate -m "$(msg)"

# Run tests
test:
	cd apps/api && pytest tests/ -v --tb=short

# Seed demo data
seed:
	cd apps/api && python -m scripts.seed

# Lint
lint:
	cd apps/api && ruff check .

# Format
fmt:
	cd apps/api && ruff format .
