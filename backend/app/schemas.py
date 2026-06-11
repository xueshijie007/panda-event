from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class UserLoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=6, max_length=128)

    @field_validator("username")
    @classmethod
    def clean_username(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("username is required")
        return value

    @field_validator("password")
    @classmethod
    def clean_password(cls, value: str) -> str:
        if len(value.strip()) < 6:
            raise ValueError("password must be at least 6 characters")
        return value


class UserRegisterRequest(UserLoginRequest):
    contact_type: Literal["wechat", "qq"]
    contact_account: str = Field(min_length=2, max_length=128)
    exchange_uid: str = Field(min_length=2, max_length=128)

    @field_validator("contact_account", "exchange_uid")
    @classmethod
    def clean_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("field is required")
        return value


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, json_encoders={Decimal: float})

    id: int
    username: str
    contact_type: str | None = None
    contact_account: str | None = None
    exchange_uid: str | None = None
    review_status: str
    balance: Decimal
    created_at: datetime
    reviewed_at: datetime | None = None


class UserReviewStatusOut(BaseModel):
    username: str
    review_status: Literal["not_found", "pending", "approved", "rejected"]
    exchange_uid: str | None = None
    reviewed_at: datetime | None = None


class AdminLoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)


class AdminLoginOut(BaseModel):
    token: str


class AdminUserOut(UserOut):
    pass


class KlineOut(BaseModel):
    time: int
    open: float
    high: float
    low: float
    close: float
    volume: float


class TickerOut(BaseModel):
    symbol: str
    price: float
    price_change_percent: float


class OpenContractRequest(BaseModel):
    symbol: Literal["BTCUSDT", "ETHUSDT", "XAUUSD"]
    interval: Literal["1m", "3m", "5m", "10m", "15m", "1h"]
    direction: Literal["CALL", "PUT"]
    stake_amount: Decimal = Field(gt=Decimal("0"))


class ContractOrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, json_encoders={Decimal: float})

    id: int
    user_id: int
    symbol: str
    interval: str
    direction: str
    stake_amount: Decimal
    entry_price: Decimal
    close_price: Decimal | None
    payout_ratio: Decimal
    status: str
    opened_at: datetime
    expiry_time: datetime
    settled_at: datetime | None
    profit_loss: Decimal


class StatsOut(BaseModel):
    total_trades: int
    wins: int
    losses: int
    draws: int
    win_rate: float
    total_profit_loss: float
    max_loss: float
    consecutive_losses: int
