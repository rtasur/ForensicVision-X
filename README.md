# ForensicVision-X Lite — SIH26150

Rapid CCTV digital-forensics vertical slice for SIH Problem Statement SIH26150.

## Current backend

- FastAPI
- PostgreSQL via SQLAlchemy/psycopg (SQLite is also supported by `DATABASE_URL`)
- SHA-256 evidence hashing
- Mock OEM sidecar parsing + OpenCV media metadata
- CCTV timestamp normalization + simulated forensic timeline
- YOLOv8n-assisted triage with examiner ACCEPT/REJECT
- PDF forensic report generation
- JWT authentication + RBAC
- Direct bcrypt password hashing (bcrypt 5.x; Passlib is intentionally not used)
- Case-ownership authorization (BOLA protection)
- Protected evidence/triage-file access
- Hash-chained audit trail + verification endpoint

## Demo users

| Username | Password | Role |
|---|---|---|
| examiner | demo | EXAMINER |
| reviewer | demo | REVIEWER |
| admin | demo | ADMIN |

## Backend setup

1. Copy `backend/.env.example` to `backend/.env` and set the PostgreSQL connection string and JWT secret.
2. From `backend/` create/activate a virtual environment.
3. Run `pip install -r requirements.txt`.
4. Start with `uvicorn main:app --reload`.

On Python 3.14, the project uses `bcrypt==5.0.0` directly because Passlib 1.7.4 has a known compatibility problem with modern bcrypt releases.
5. Open `http://127.0.0.1:8000/docs`.

The startup migration preserves the existing prototype database and backfills old cases to the seeded `examiner` account when `owner_id` is introduced.

## Archive note

The distributable ZIP intentionally excludes the local `.env`, `.venv`, Python caches, and generated runtime evidence/report files. Use `backend/.env.example` to recreate local configuration.
