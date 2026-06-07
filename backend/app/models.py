from decimal import Decimal
from enum import Enum

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Direction(str, Enum):
    CALL = "CALL"
    PUT = "PUT"


class OrderStatus(str, Enum):
    OPEN = "OPEN"
    WON = "WON"
    LOST = "LOST"
    DRAW = "DRAW"
    CANCELLED = "CANCELLED"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_type: Mapped[str | None] = mapped_column(String(16), nullable=True)
    contact_account: Mapped[str | None] = mapped_column(String(128), nullable=True)
    exchange_uid: Mapped[str | None] = mapped_column(String(128), nullable=True)
    review_status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    reviewed_at = mapped_column(DateTime(timezone=True), nullable=True)
    balance: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False, default=Decimal("10000.00"))
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    orders: Mapped[list["EventContractOrder"]] = relationship(back_populates="user")


class EventContractOrder(Base):
    __tablename__ = "event_contract_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    symbol: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    interval: Mapped[str] = mapped_column(String(10), nullable=False)
    direction: Mapped[str] = mapped_column(String(10), nullable=False)
    stake_amount: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False)
    entry_price: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False)
    close_price: Mapped[Decimal | None] = mapped_column(Numeric(18, 8), nullable=True)
    payout_ratio: Mapped[Decimal] = mapped_column(Numeric(8, 4), nullable=False, default=Decimal("0.8"))
    status: Mapped[str] = mapped_column(String(20), index=True, nullable=False, default=OrderStatus.OPEN.value)
    opened_at = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expiry_time = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    settled_at = mapped_column(DateTime(timezone=True), nullable=True)
    profit_loss: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False, default=Decimal("0"))

    user: Mapped[User] = relationship(back_populates="orders")


class KlineCache(Base):
    __tablename__ = "kline_cache"
    __table_args__ = (UniqueConstraint("symbol", "interval", "open_time", name="uq_kline_symbol_interval_open"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    symbol: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    interval: Mapped[str] = mapped_column(String(10), index=True, nullable=False)
    open_time = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    open: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False)
    high: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False)
    low: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False)
    close: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False)
    volume: Mapped[Decimal] = mapped_column(Numeric(24, 8), nullable=False)
    close_time = mapped_column(DateTime(timezone=True), nullable=False)
