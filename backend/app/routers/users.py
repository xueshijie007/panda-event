from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import UserLoginRequest, UserOut, UserRegisterRequest, UserReviewStatusOut
from app.security import hash_password, verify_password

router = APIRouter()


@router.post("/login", response_model=UserOut)
def login(payload: UserLoginRequest, db: Session = Depends(get_db)) -> User:
    username = payload.username.strip()
    user = db.scalar(select(User).where(User.username == username))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="account not found, please register first")

    if not user.password_hash:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="account has no password, please register again")
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid account or password")
    if user.review_status == "pending":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="account is pending admin review")
    if user.review_status == "rejected":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="account registration was rejected")
    return user


@router.post("/register", response_model=UserOut)
def register(payload: UserRegisterRequest, db: Session = Depends(get_db)) -> User:
    username = payload.username.strip()
    exchange_uid = payload.exchange_uid.strip()
    if payload.contact_type != "qq" or payload.contact_account.strip() != username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="QQ number must be used as the account")

    uid_owner = db.scalar(select(User).where(User.exchange_uid == exchange_uid, User.username != username))
    if uid_owner:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="exchange UID is already registered")

    user = db.scalar(select(User).where(User.username == username))
    if not user:
        user = User(username=username)
        db.add(user)

    user.password_hash = hash_password(payload.password)
    user.contact_type = "qq"
    user.contact_account = username
    user.exchange_uid = exchange_uid
    user.review_status = "pending"
    user.reviewed_at = None
    db.add(user)
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="could not create user") from exc
    db.refresh(user)
    return user


@router.get("/review-status", response_model=UserReviewStatusOut)
def get_review_status(username: str, db: Session = Depends(get_db)) -> dict[str, str | None]:
    username = username.strip()
    if not username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="QQ number is required")
    user = db.scalar(select(User).where(User.username == username))
    if not user:
        return {"username": username, "review_status": "not_found", "exchange_uid": None, "reviewed_at": None}
    return {
        "username": user.username,
        "review_status": user.review_status,
        "exchange_uid": user.exchange_uid,
        "reviewed_at": user.reviewed_at,
    }


@router.get("/me", response_model=UserOut)
def get_me(user_id: int, db: Session = Depends(get_db)) -> User:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user not found")
    if user.review_status != "approved":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="VIP access is not approved yet")
    return user
