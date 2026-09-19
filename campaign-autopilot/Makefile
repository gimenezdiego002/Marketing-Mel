# Local development, verification, and repeatable demo entry points.
.PHONY: dev-web dev-agent seed demo test reset db-reset

# Rebuild only the local database; requires Supabase CLI and running local services.
db-reset:
	npx supabase db reset --local

dev-web:
	cd apps/web && npm run dev

dev-agent:
	python -m uvicorn main:app --app-dir apps/agent --reload

seed:
	python data/seed/generate_seed.py
	python scripts/seed_db.py

demo:
	python scripts/run_demo.py

test:
	python -m pytest

reset:
	python scripts/reset_demo.py
