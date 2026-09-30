# =========================================================
# AUTH ROUTES
# =========================================================

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from schemas import LoginRequest
from security import authenticate_user, create_access_token


router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login")
def login(
    credentials: LoginRequest,
    db: Session = Depends(get_db),
):
    user = authenticate_user(
        db,
        credentials.username,
        credentials.password,
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(user)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role,
        },
    }
