# Docker Compose Setup Guide

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Git (to clone the repo)
- No local Python, Node, or MySQL required — Docker handles everything

---

## Project Services

| Service | Container | Port |
|---|---|---|
| Next.js frontend | `frontend` | http://localhost:3000 |
| Flask backend | `backend` | http://localhost:5000 |
| MySQL 8.0 | `db` | localhost:3306 |
| Redis 7 | `redis` | localhost:6379 |

---

## First-Time Setup

### Step 1 — Navigate to the project root

```bash
cd lms-app
```

All `docker compose` commands must be run from this directory (where `docker-compose.yml` lives).

### Step 2 — Build and start all services

```bash
docker compose up --build
```

This will:
1. Pull `mysql:8.0` and `redis:7-alpine` images
2. Build the Flask backend image from `backend/Dockerfile`
3. Build the Next.js frontend image from `frontend/Dockerfile`
4. Start all four containers
5. Wait for MySQL and Redis health checks before starting the backend

**First build takes 3–5 minutes.** Subsequent starts are faster (images are cached).

Watch for this in the logs — it means the backend is ready:

```
backend-1  |  * Running on http://0.0.0.0:5000
```

### Step 3 — Run database migrations (first time only)

Open a second terminal and run:

```bash
docker compose exec backend flask db migrate -m "initial schema"
docker compose exec backend flask db upgrade
```

- `migrate` generates the migration file from your SQLAlchemy models
- `upgrade` applies it to the MySQL database

You should see:

```
INFO  [alembic.runtime.migration] Running upgrade  -> <revision>, initial schema
```

### Step 4 — Seed development data (optional)

```bash
docker compose exec backend flask seed-db
```

This populates the database with sample users, courses, and lessons for local testing.

### Step 5 — Verify everything is running

Open your browser:

- **Frontend:** http://localhost:3000
- **Backend health check:** http://localhost:5000/api/v1/health

---

## Day-to-Day Workflow

### Start (without rebuilding)

```bash
docker compose up
```

Use this on most days — images are already built, this just starts the containers.

### Start in background

```bash
docker compose up -d
```

### Stop

```bash
docker compose down
```

This stops and removes containers but **preserves the MySQL volume** (`mysql_data`), so your data persists between sessions.

### Stop and wipe all data

```bash
docker compose down -v
```

The `-v` flag removes the `mysql_data` volume. Use this for a clean reset.

---

## Useful Commands

### View logs

```bash
# All services
docker compose logs -f

# Single service
docker compose logs -f backend
docker compose logs -f frontend
```

### Rebuild a single service

After changing a `Dockerfile` or `requirements/*.txt`:

```bash
docker compose up --build backend
docker compose up --build frontend
```

### Open a shell inside a container

```bash
# Flask backend (Python)
docker compose exec backend bash

# MySQL client
docker compose exec db mysql -u lms_user -plms_password lms_db
```

### Run Flask CLI commands

```bash
docker compose exec backend flask db upgrade
docker compose exec backend flask db migrate -m "add new column"
docker compose exec backend flask seed-db
```

### Run backend tests

```bash
docker compose exec backend pytest
```

---

## Hot Reload Behaviour

| Service | Live reload? | How |
|---|---|---|
| Backend | Yes | `./backend` mounted into container; Flask `--debug` mode auto-reloads on `.py` changes |
| Frontend | Yes | `./frontend` mounted into container; Next.js dev server watches for changes |

You do **not** need to restart containers after editing Python or TypeScript source files.

You **do** need to rebuild (`--build`) after:
- Changing `requirements/*.txt` (Python dependencies)
- Changing `package.json` / `package-lock.json` (Node dependencies)
- Changing `Dockerfile`

---

## Environment Variables

All environment variables are injected by `docker-compose.yml` — no `.env` file is needed to run with Docker.

For local development **outside Docker** (running Flask/Next.js directly), copy and fill in:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

---

## Troubleshooting

### Port already in use

```
Error: address already in use 0.0.0.0:3306
```

Something on your machine is using that port (e.g. a local MySQL). Stop the conflicting service or change the host port in `docker-compose.yml`:

```yaml
ports:
  - '3307:3306'  # use 3307 on your host
```

### Backend fails to start — `Can't connect to MySQL`

MySQL takes ~15 seconds to initialise on first run. The backend has a `depends_on` health check, but if it still fails:

```bash
docker compose restart backend
```

### Migration error — `Target database is not up to date`

```bash
docker compose exec backend flask db upgrade
```

### Clean slate — delete everything and start over

```bash
docker compose down -v   # removes containers + volumes
docker compose up --build
# then re-run migrations and seed
```
