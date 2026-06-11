from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_DOWN

from fastapi import HTTPException, status
from sqlalchemy import Select, delete, func, select
from sqlalchemy.orm import Session

from app.models import EventContractOrder, OrderStatus, User
from app.schemas import OpenContractRequest
from app.services.market_service import SUPPORTED_INTERVALS, market_data_adapter

MIN_STAKE = Decimal("1")
MAX_OPEN_ORDERS = 50
PAYOUT_RATIOS = {
    "1m": Decimal("0.60"),
    "3m": Decimal("0.64"),
    "5m": Decimal("0.67"),
    "10m": Decimal("0.70"),
    "15m": Decimal("0.72"),
    "1h": Decimal("0.75"),
}
MONEY_QUANT = Decimal("0.00000001")
DEFAULT_VIRTUAL_BALANCE = Decimal("1000.00")


def quantize_money(value: Decimal) -> Decimal:
    return value.quantize(MONEY_QUANT, rounding=ROUND_DOWN)


def get_user_or_404(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user not found")
    return user


def open_contract(db: Session, user_id: int, payload: OpenContractRequest) -> EventContractOrder:
    user = get_user_or_404(db, user_id)
    if user.review_status != "approved":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="VIP access is not approved yet")

    stake = quantize_money(payload.stake_amount)
    if stake < MIN_STAKE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="minimum stake is 1 USDT")

    open_count = db.scalar(
        select(func.count(EventContractOrder.id)).where(
            EventContractOrder.user_id == user_id,
            EventContractOrder.status == OrderStatus.OPEN.value,
        )
    )
    if open_count >= MAX_OPEN_ORDERS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="maximum 50 open contracts allowed")

    if Decimal(user.balance) < stake:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="insufficient virtual balance")

    payout_ratio = PAYOUT_RATIOS[payload.interval]
    entry_price = market_data_adapter.get_price_decimal(payload.symbol)
    now = datetime.now(timezone.utc)
    expiry_time = now + timedelta(seconds=SUPPORTED_INTERVALS[payload.interval])

    # Virtual balance freeze: the stake is deducted immediately. Settlement later
    # returns stake + payout for wins, only stake for draws, and nothing for losses.
    user.balance = quantize_money(Decimal(user.balance) - stake)
    order = EventContractOrder(
        user_id=user_id,
        symbol=payload.symbol,
        interval=payload.interval,
        direction=payload.direction,
        stake_amount=stake,
        entry_price=entry_price,
        payout_ratio=payout_ratio,
        status=OrderStatus.OPEN.value,
        expiry_time=expiry_time,
        profit_loss=Decimal("0"),
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def list_open_orders(db: Session, user_id: int) -> list[EventContractOrder]:
    return list(
        db.scalars(
            select(EventContractOrder)
            .where(EventContractOrder.user_id == user_id, EventContractOrder.status == OrderStatus.OPEN.value)
            .order_by(EventContractOrder.expiry_time.asc())
        )
    )


def list_history_orders(db: Session, user_id: int, limit: int = 100) -> list[EventContractOrder]:
    return list(
        db.scalars(
            select(EventContractOrder)
            .where(EventContractOrder.user_id == user_id, EventContractOrder.status != OrderStatus.OPEN.value)
            .order_by(EventContractOrder.opened_at.desc())
            .limit(limit)
        )
    )


def get_stats(db: Session, user_id: int) -> dict[str, int | float]:
    settled = list_history_orders(db, user_id, limit=10000)
    total = len(settled)
    wins = sum(1 for order in settled if order.status == OrderStatus.WON.value)
    losses = sum(1 for order in settled if order.status == OrderStatus.LOST.value)
    draws = sum(1 for order in settled if order.status == OrderStatus.DRAW.value)
    total_pl = sum((Decimal(order.profit_loss) for order in settled), Decimal("0"))
    negative_pl = [Decimal(order.profit_loss) for order in settled if Decimal(order.profit_loss) < 0]

    consecutive_losses = 0
    for order in sorted(settled, key=lambda item: item.settled_at or item.opened_at, reverse=True):
        if order.status == OrderStatus.LOST.value:
            consecutive_losses += 1
        else:
            break

    return {
        "total_trades": total,
        "wins": wins,
        "losses": losses,
        "draws": draws,
        "win_rate": round((wins / total) * 100, 2) if total else 0.0,
        "total_profit_loss": float(quantize_money(total_pl)),
        "max_loss": float(min(negative_pl)) if negative_pl else 0.0,
        "consecutive_losses": consecutive_losses,
    }


def request_reset_account(db: Session, user_id: int) -> User:
    user = get_user_or_404(db, user_id)
    if user.review_status != "approved":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="VIP access is not approved yet")
    if user.reset_review_status == "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="reset request is already pending review")
    user.reset_review_status = "pending"
    user.reset_requested_at = datetime.now(timezone.utc)
    user.reset_reviewed_at = None
    db.commit()
    db.refresh(user)
    return user


def reset_account(db: Session, user_id: int) -> User:
    user = get_user_or_404(db, user_id)
    db.execute(delete(EventContractOrder).where(EventContractOrder.user_id == user_id))
    user.balance = DEFAULT_VIRTUAL_BALANCE
    user.reset_review_status = "approved"
    user.reset_reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return user
