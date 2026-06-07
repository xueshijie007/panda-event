from fastapi import APIRouter, HTTPException, Query, status

from app.schemas import KlineOut, TickerOut
from app.services.market_service import MarketDataError, SUPPORTED_INTERVALS, market_data_adapter

router = APIRouter()


@router.get("/symbols", response_model=list[str])
def get_symbols() -> list[str]:
    return market_data_adapter.get_symbols()


@router.get("/intervals", response_model=list[str])
def get_intervals() -> list[str]:
    return list(SUPPORTED_INTERVALS.keys())


@router.get("/klines", response_model=list[KlineOut])
def get_klines(symbol: str = Query(...), interval: str = Query("5m"), limit: int = Query(200, ge=1, le=1000)):
    try:
        return market_data_adapter.get_klines(symbol=symbol, interval=interval, limit=limit)
    except MarketDataError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/ticker", response_model=TickerOut)
def get_ticker(symbol: str = Query(...)):
    try:
        return market_data_adapter.get_ticker(symbol=symbol)
    except MarketDataError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
