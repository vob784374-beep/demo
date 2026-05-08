.PHONY: build up down reset logs shell migrate test test-e2e test-e2e-ui test-install test-docker test-docker-ui

build:
	docker compose build

up:
	docker compose up --build

down:
	docker compose down

reset:
	docker compose down -v

logs:
	docker compose logs -f

shell:
	docker compose exec backend bash

migrate:
	docker compose exec backend flask db upgrade

test:
	docker compose exec backend pytest tests/ -q

# Local E2E tests (requires running apps)
test-e2e:
	cd tests && npm install && npx playwright test

test-e2e-ui:
	cd tests && npm install && npx playwright test --ui

test-install:
	cd tests && npm install && npx playwright install --with-deps

# Docker E2E tests (auto starts required services)
test-docker:
	docker compose --profile automation up automation

test-docker-ui:
	docker compose --profile automation up automation-ui
