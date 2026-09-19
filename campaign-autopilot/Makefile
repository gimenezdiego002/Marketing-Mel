# Entry points for later build steps; Step 0 deliberately supplies stubs only.
.PHONY: dev-web dev-agent seed demo test reset db-reset

# Rebuild only the local database; requires Supabase CLI and running local services.
db-reset:
	supabase db reset --local

dev-web:
	@echo "TODO: start the Next.js web app in apps/web."

dev-agent:
	@echo "TODO: start the FastAPI agent in apps/agent."

seed:
	python data/seed/generate_seed.py
	python scripts/seed_db.py

demo:
	@echo "TODO: run the simulated creative-fatigue demo."

test:
	python -m pytest

reset:
	@echo "TODO: reset the local demo database; no data is changed by this stub."
