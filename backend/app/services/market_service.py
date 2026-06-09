from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
import math
import os
import random
import time
from typing import Any

import httpx

SUPPORTED_SYMBOLS = ["BTCUSDT", "ETHUSDT"]
SUPPORTED_INTERVALS: dict[str, int] = {
    "1m": 60,
    "3m": 3 * 60,
    "5m": 5 * 60,
    "10m": 10 * 60,
    "15m": 15 * 60,
    "1h": 60 * 60,
}

BINANCE_BASE_URL = "https://api.binance.com"
# Binance has native 1m/3m/5m/15m/1h. 10m is intentionally aggregated from 1m candles.
NATIVE_BINANCE_INTERVALS = {"1m", "3m", "5m", "15m", "1h"}
HTTP_TIMEOUT_SECONDS = float(os.getenv("MARKET_HTTP_TIMEOUT", "2.0"))
MARKET_DATA_MODE = os.getenv("MARKET_DATA_MODE", "exchange").lower()


class MarketDataError(ValueError):
    pass


def _validate_symbol_interval(symbol: str, interval: str | None = None) -> None:
    if symbol not in SUPPORTED_SYMBOLS:
        raise MarketDataError(f"unsupported symbol: {symbol}")
    if interval is not None and interval not in SUPPORTED_INTERVALS:
        raise MarketDataError(f"unsupported interval: {interval}")


def _binance_kline_to_dict(row: list[Any]) -> dict[str, float | int]:
    return {
        "time": int(row[0] // 1000),
        "open": float(row[1]),
        "high": float(row[2]),
        "low": float(row[3]),
        "close": float(row[4]),
        "volume": float(row[5]),
    }


class MarketDataAdapter:
    def __init__(self, base_url: str = BINANCE_BASE_URL) -> None:
        self.base_url = base_url

    def get_symbols(self) -> list[str]:
        return SUPPORTED_SYMBOLS

    def get_klines(self, symbol: str, interval: str, limit: int = 200) -> list[dict[str, float | int]]:
        _validate_symbol_interval(symbol, interval)
        limit = max(1, min(limit, 1000))
        if MARKET_DATA_MODE == "mock":
            return self._mock_klines(symbol, interval, limit)
        try:
            if interval in NATIVE_BINANCE_INTERVALS:
                return self._fetch_binance_klines(symbol, interval, limit)

            # Kline aggregation logic: when an exchange does not expose a target interval
            # such as 10m, fetch enough 1m candles and bucket them by target window.
            source_limit = min(1000, limit * (SUPPORTED_INTERVALS[interval] // 60) + 5)
            one_minute = self._fetch_binance_klines(symbol, "1m", source_limit)
            return self._aggregate_klines(one_minute, SUPPORTED_INTERVALS[interval], limit)
        except Exception as exc:
            raise MarketDataError("failed to fetch realtime exchange klines") from exc

    def get_ticker(self, symbol: str) -> dict[str, float | str]:
        _validate_symbol_interval(symbol)
        if MARKET_DATA_MODE == "mock":
            klines = self._mock_klines(symbol, "5m", 288)
            first = float(klines[0]["close"])
            last = float(klines[-1]["close"])
            change = ((last - first) / first) * 100 if first else 0.0
            return {"symbol": symbol, "price": last, "price_change_percent": change}
        try:
            with httpx.Client(timeout=HTTP_TIMEOUT_SECONDS) as client:
                response = client.get(f"{self.base_url}/api/v3/ticker/24hr", params={"symbol": symbol})
                response.raise_for_status()
                data = response.json()
                return {
                    "symbol": symbol,
                    "price": float(data["lastPrice"]),
                    "price_change_percent": float(data["priceChangePercent"]),
                }
        except Exception as exc:
            raise MarketDataError("failed to fetch realtime exchange ticker") from exc

    def get_price_decimal(self, symbol: str) -> Decimal:
        ticker = self.get_ticker(symbol)
        return Decimal(str(ticker["price"]))

    def _fetch_binance_klines(self, symbol: str, interval: str, limit: int) -> list[dict[str, float | int]]:
        with httpx.Client(timeout=HTTP_TIMEOUT_SECONDS) as client:
            response = client.get(
                f"{self.base_url}/api/v3/klines",
                params={"symbol": symbol, "interval": interval, "limit": limit},
            )
            response.raise_for_status()
            rows = response.json()
        return [_binance_kline_to_dict(row) for row in rows]

    def _aggregate_klines(
        self,
        source: list[dict[str, float | int]],
        target_seconds: int,
        limit: int,
    ) -> list[dict[str, float | int]]:
        buckets: dict[int, list[dict[str, float | int]]] = {}
        for candle in source:
            bucket_time = int(candle["time"]) - (int(candle["time"]) % target_seconds)
            buckets.setdefault(bucket_time, []).append(candle)

        aggregated: list[dict[str, float | int]] = []
        for bucket_time in sorted(buckets):
            candles = sorted(buckets[bucket_time], key=lambda item: int(item["time"]))
            expected_count = target_seconds // 60
            if len(candles) < expected_count and bucket_time != max(buckets):
                continue
            aggregated.append(
                {
                    "time": bucket_time,
                    "open": float(candles[0]["open"]),
                    "high": max(float(c["high"]) for c in candles),
                    "low": min(float(c["low"]) for c in candles),
                    "close": float(candles[-1]["close"]),
                    "volume": sum(float(c["volume"]) for c in candles),
                }
            )
        return aggregated[-limit:]

    def _mock_klines(self, symbol: str, interval: str, limit: int) -> list[dict[str, float | int]]:
        seconds = SUPPORTED_INTERVALS[interval]
        now = int(time.time())
        start = now - (now % seconds) - (limit - 1) * seconds
        base_price = 65000.0 if symbol == "BTCUSDT" else 3500.0
        # Stable-ish seed keeps refreshes realistic while still moving over time.
        random.seed(f"{symbol}-{interval}-{start // seconds}")
        price = base_price * (1 + math.sin(start / 86400) * 0.015)
        klines: list[dict[str, float | int]] = []
        for index in range(limit):
            open_price = price
            drift = random.uniform(-0.004, 0.004)
            close_price = max(1.0, open_price * (1 + drift))
            high = max(open_price, close_price) * (1 + random.uniform(0, 0.0025))
            low = min(open_price, close_price) * (1 - random.uniform(0, 0.0025))
            volume = random.uniform(10, 120)
            klines.append(
                {
                    "time": start + index * seconds,
                    "open": round(open_price, 2),
                    "high": round(high, 2),
                    "low": round(low, 2),
                    "close": round(close_price, 2),
                    "volume": round(volume, 6),
                }
            )
            price = close_price
        return klines


market_data_adapter = MarketDataAdapter()
