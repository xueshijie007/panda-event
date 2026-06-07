from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from decimal import Decimal
from typing import Callable

from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.models import EventContractOrder, OrderStatus, User
from app.services.contract_service import quantize_money
from app.services.market_service import market_data_adapter

SCAN_INTERVAL_SECONDS = 3


def settle_order(db: Session, order: EventContractOrder, close_price: Decimal | None = None) -> EventContractOrder:
    if order.status != OrderStatus.OPEN.value:
        return order

    user = db.get(User, order.user_id)
    if not user:
        order.status = OrderStatus.CANCELLED.value
        order.settled_at = datetime.now(timezone.utc)
        return order

    close_price = close_price or market_data_adapter.get_price_decimal(order.symbol)
    stake = Decimal(order.stake_amount)
    payout_ratio = Decimal(order.payout_ratio)

    won = (order.direction == "CALL" and close_price > Decimal(order.entry_price)) or (
        order.direction == "PUT" and close_price < Decimal(order.entry_price)
    )
    draw = close_price == Decimal(order.entry_price)

    # Event contract settlement logic:
    # CALL wins if expiry close > entry. PUT wins if expiry close < entry.
    # Draw refunds the frozen stake. Loss keeps the already-deducted stake frozen away.
    order.close_price = close_price
    order.settled_at = datetime.now(timezone.utc)
    if draw:
        refund = stake
        order.status = OrderStatus.DRAW.value
        order.profit_loss = Decimal("0")
        user.balance = quantize_money(Decimal(user.balance) + refund)
    elif won:
        refund = stake * (Decimal("1") + payout_ratio)
        order.status = OrderStatus.WON.value
        order.profit_loss = quantize_money(stake * payout_ratio)
        user.balance = quantize_money(Decimal(user.balance) + refund)
    else:
        order.status = OrderStatus.LOST.value
        order.profit_loss = quantize_money(-stake)

    return order


def settle_due_orders(db: Session) -> int:
    now = datetime.now(timezone.utc)
    due_orders = list(
        db.scalars(
            select(EventContractOrder).where(
                EventContractOrder.status == OrderStatus.OPEN.value,
                EventContractOrder.expiry_time <= now,
            )
        )
    )
    settled = 0
    for order in due_orders:
        try:
            settle_order(db, order)
            settled += 1
        except Exception:
            # Keep the order OPEN if market data is temporarily unavailable.
            db.rollback()
            continue
    db.commit()
    return settled


async def settlement_loop(session_factory: Callable[[], Session]) -> None:
    # Periodic settlement task: scans every few seconds for expired OPEN contracts.
    # It is intentionally small and local-process based for the MVP.
    while True:
        db = session_factory()
        try:
            settle_due_orders(db)
        finally:
            db.close()
        await asyncio.sleep(SCAN_INTERVAL_SECONDS)
