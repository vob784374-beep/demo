# lms-app — English Learning Management System

A production-ready LMS for English language courses supporting Pronunciation, Vocabulary, Grammar, Writing, and IELTS preparation.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router, TypeScript, Tailwind CSS, shadcn/ui) |
| Backend | Python 3.12 + Flask 3.x (Application Factory, Blueprints) |
| Database | MySQL 8.x (SQLAlchemy 2.x ORM, Flask-Migrate) |
| Cache | Redis 7.x |
| Infrastructure | AWS ECS Fargate, RDS, ElastiCache, S3, CloudFront, ALB |
| CI/CD | GitHub Actions |
| IaC | Terraform |

## Quick Start (Local Development)

### Prerequisites

- Docker Desktop
- Node.js 20+
- Python 3.12+

### Run the full stack

```bash
docker-compose up
```

Services:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **Health check:** http://localhost:5000/api/v1/health
- **MySQL:** localhost:3306
- **Redis:** localhost:6379

### Run services individually

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements/dev.txt
export APP_ENV=development
flask run --port 5000
```

## Project Structure

```
lms-app/
├── frontend/          # Next.js 15 application
├── backend/           # Flask API
├── infrastructure/    # Terraform IaC (AWS)
├── .github/workflows/ # GitHub Actions CI/CD
└── docker-compose.yml # Local dev orchestration
```

## User Roles

- **Student** — Browse courses, enroll, complete lessons and exercises
- **Teacher** — Create and manage courses, lessons, exercises, assessments
- **Admin** — Manage users, view system statistics

## Courses

1. Pronunciation
2. Vocabulary to Speak
3. Grammar to Speak
4. Essential Writing
5. IELTS Writing
6. IELTS Speaking
