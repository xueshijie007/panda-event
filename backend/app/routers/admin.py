from __future__ import annotations

from datetime import datetime, timezone
import os
import secrets

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import AdminLoginOut, AdminLoginRequest, AdminUserOut
from app.services.contract_service import reset_account

router = APIRouter()

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "PandaAdmin123")
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", secrets.token_urlsafe(32))


def require_admin(authorization: str = Header(default="")) -> None:
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or token != ADMIN_TOKEN:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid admin token")


@router.post("/login", response_model=AdminLoginOut)
def admin_login(payload: AdminLoginRequest) -> dict[str, str]:
    if payload.username != ADMIN_USERNAME or payload.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid admin account or password")
    return {"token": ADMIN_TOKEN}


@router.get("/users", response_model=list[AdminUserOut], dependencies=[Depends(require_admin)])
def list_users(status_filter: str = "pending", db: Session = Depends(get_db)) -> list[User]:
    query = select(User).order_by(User.created_at.desc())
    if status_filter == "reset_pending":
        query = query.where(User.reset_review_status == "pending")
    elif status_filter != "all":
        query = query.where(User.review_status == status_filter)
    return list(db.scalars(query))


@router.post("/users/{user_id}/approve", response_model=AdminUserOut, dependencies=[Depends(require_admin)])
def approve_user(user_id: int, db: Session = Depends(get_db)) -> User:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user not found")
    user.review_status = "approved"
    user.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return user


@router.post("/users/{user_id}/reject", response_model=AdminUserOut, dependencies=[Depends(require_admin)])
def reject_user(user_id: int, db: Session = Depends(get_db)) -> User:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user not found")
    user.review_status = "rejected"
    user.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return user


@router.post("/users/{user_id}/reset/approve", response_model=AdminUserOut, dependencies=[Depends(require_admin)])
def approve_reset_user(user_id: int, db: Session = Depends(get_db)) -> User:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user not found")
    if user.reset_review_status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="no pending reset request")
    return reset_account(db, user_id)


@router.post("/users/{user_id}/reset/reject", response_model=AdminUserOut, dependencies=[Depends(require_admin)])
def reject_reset_user(user_id: int, db: Session = Depends(get_db)) -> User:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user not found")
    if user.reset_review_status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="no pending reset request")
    user.reset_review_status = "rejected"
    user.reset_reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return user
