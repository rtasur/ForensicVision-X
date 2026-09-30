# =========================================================
# AUTHENTICATION / AUTHORIZATION
# =========================================================

import os
from datetime import datetime, timedelta, timezone

import bcrypt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from database import get_db
from models import User


load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY is missing from .env")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
)

# bcrypt 5.x supports Python 3.14 and is used directly here instead of
# Passlib, whose 1.7.4 bcrypt backend is incompatible with bcrypt 5.x.
# bcrypt intentionally limits the password input to 72 bytes. We enforce
# that limit explicitly so login/hash operations fail cleanly instead of
# surfacing an internal backend error.
MAX_BCRYPT_PASSWORD_BYTES = 72

bearer_scheme = HTTPBearer(auto_error=True)


def _password_bytes(password: str) -> bytes:
    if not isinstance(password, str):
        raise ValueError("Password must be a string")

    password_bytes = password.encode("utf-8")

    if not password_bytes:
        raise ValueError("Password cannot be empty")

    if len(password_bytes) > MAX_BCRYPT_PASSWORD_BYTES:
        raise ValueError(
            "Password must be 72 UTF-8 bytes or fewer for bcrypt"
        )

    return password_bytes


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        password_bytes = _password_bytes(plain_password)
        stored_hash = hashed_password.encode("utf-8")
        return bcrypt.checkpw(password_bytes, stored_hash)
    except (ValueError, TypeError):
        return False


def get_password_hash(password: str) -> str:
    password_bytes = _password_bytes(password)
    return bcrypt.hashpw(
        password_bytes,
        bcrypt.gensalt(rounds=int(os.getenv("BCRYPT_ROUNDS", "12"))),
    ).decode("utf-8")


def authenticate_user(
    db: Session,
    username: str,
    password: str,
) -> User | None:
    user = (
        db.query(User)
        .filter(User.username == username)
        .first()
    )

    if user is None or not verify_password(
        password,
        user.hashed_password,
    ):
        return None

    return user


def create_access_token(user: User) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user.id),
        "role": user.role,
        "exp": expires_at,
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials

    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )
        subject = payload.get("sub")
        if not subject:
            raise unauthorized
        user_id = int(subject)
    except (JWTError, ValueError):
        raise unauthorized

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise unauthorized

    return user


def require_role(allowed_roles: list[str]):
    """Return a FastAPI dependency that enforces one of the supplied roles."""

    def role_checker(
        current_user: User = Depends(get_current_user),
    ) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions for this operation",
            )
        return current_user

    return role_checker


def ensure_case_access(case, user: User):
    """Enforce object-level authorization for case-owned resources."""
    if user.role in {"ADMIN", "AUDITOR"}:
        return case

    if case.owner_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to access this case",
        )

    return case
