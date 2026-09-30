# =========================================================
# FORENSICVISION-X LITE — APPLICATION ENTRYPOINT
# =========================================================

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import SessionLocal, init_db, migrate_existing_cases
from models import User
from security import get_password_hash

# Import every model module before init_db() so SQLAlchemy knows all tables.
import models  # noqa: F401,E402

from routers import auth, audit, cases, evidence  # noqa: E402


DEMO_USERS = [
    ("examiner", "demo", "EXAMINER"),
    ("reviewer", "demo", "REVIEWER"),
    ("admin", "demo", "ADMIN"),
]



def seed_demo_users() -> int:
    db = SessionLocal()
    try:
        examiner_id = None

        for username, password, role in DEMO_USERS:
            user = (
                db.query(User)
                .filter(User.username == username)
                .first()
            )

            if user is None:
                user = User(
                    username=username,
                    hashed_password=get_password_hash(password),
                    role=role,
                )
                db.add(user)
                db.flush()

            elif user.role != role:
                user.role = role

            if username == "examiner":
                examiner_id = user.id

        db.commit()

        # Refresh in case the examiner was newly inserted.
        examiner = (
            db.query(User)
            .filter(User.username == "examiner")
            .first()
        )
        if examiner is None:
            raise RuntimeError("Failed to seed demo examiner")

        examiner_id = examiner.id
        return examiner_id
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    examiner_id = seed_demo_users()
    migrate_existing_cases(examiner_id)
    yield


app = FastAPI(
    title="ForensicVision-X Lite",
    description="SIH26150 CCTV Digital Forensics Prototype",
    version="0.5.5",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response


app.include_router(auth.router)
app.include_router(cases.router)
app.include_router(evidence.router)
app.include_router(audit.router)


@app.get("/")
def root():
    return {
        "project": "ForensicVision-X Lite",
        "status": "running",
        "version": "0.5.5",
        "security": {
            "authentication": "JWT",
            "authorization": "RBAC + case ownership",
            "evidence_access": "protected",
            "audit_chain": "hash-verified",
        },
    }
