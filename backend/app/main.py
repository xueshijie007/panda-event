from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
import asyncio
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine, SessionLocal, ensure_user_profile_columns
from app.routers import admin, contracts, market, users
from app.services.settlement_service import settlement_loop


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    Base.metadata.create_all(bind=engine)
    ensure_user_profile_columns()
    task = asyncio.create_task(settlement_loop(SessionLocal), name="settlement-loop")
    app.state.settlement_task = task
    try:
        yield
    finally:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


app = FastAPI(title="Crypto Event Contract Simulator API", version="0.1.0", lifespan=lifespan)

cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    # Local development convenience: allow frontends opened through private LAN IPs.
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(market.router, prefix="/api/market", tags=["market"])
app.include_router(contracts.router, prefix="/api/contracts", tags=["contracts"])


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}

