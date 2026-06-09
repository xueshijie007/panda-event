from __future__ import annotations

from decimal import Decimal
import math
import os
import random
import time
from typing import Any, Callable

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
BYBIT_BASE_URL = "https://api.bybit.com"
OKX_BASE_URL = "https://www.okx.com"
NATIVE_BINANCE_INTERVALS = {"1m", "3m", "5m", "15m", "1h"}
NATIVE_BYBIT_INTERVALS = {"1m", "3m", "5m", "15m", "1h"}
NATIVE_OKX_INTERVALS = {"1m", "3m", "5m", "15m", "1h"}
BYBIT_INTERVAL_MAP = {"1m": "1", "3m": "3", "5m": "5", "15m": "15", "1h": "60"}
OKX_INTERVAL_MAP = {"1m": "1m", "3m": "3m", "5m": "5m", "15m": "15m", "1h": "1H"}
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


def _okx_symbol(symbol: str) -> str:
    return symbol.replace("USDT", "-USDT")


def _okx_kline_to_dict(row: list[Any]) -> dict[str, float | int]:
    return {
        "time": int(int(row[0]) // 1000),
        "open": float(row[1]),
        "high": float(row[2]),
        "low": float(row[3]),
        "close": float(row[4]),
        "volume": float(row[5]),
    }


def _bybit_kline_to_dict(row: list[Any]) -> dict[str, float | int]:
    return {
        "time": int(int(row[0]) // 1000),
        "open": float(row[1]),
        "high": float(row[2]),
        "low": float(row[3]),
        "close": float(row[4]),
        "volume": float(row[5]),
    }


class MarketDataAdapter:
    def get_symbols(self) -> list[str]:
        return SUPPORTED_SYMBOLS

    def get_klines(self, symbol: str, interval: str, limit: int = 200) -> list[dict[str, float | int]]:
        _validate_symbol_interval(symbol, interval)
        limit = max(1, min(limit, 1000))
        if MARKET_DATA_MODE == "mock":
            return self._mock_klines(symbol, interval, limit)

        errors: list[str] = []
        for name, fetcher in self._kline_fetchers(interval):
            try:
                return fetcher(symbol, interval, limit)
            except Exception as exc:
                errors.append(f"{name}: {exc}")
        raise MarketDataError(f"failed to fetch realtime exchange klines ({'; '.join(errors)})")

    def get_ticker(self, symbol: str) -> dict[str, float | str]:
        _validate_symbol_interval(symbol)
        if MARKET_DATA_MODE == "mock":
            klines = self._mock_klines(symbol, "5m", 288)
            first = float(klines[0]["close"])
            last = float(klines[-1]["close"])
            change = ((last - first) / first) * 100 if first else 0.0
            return {"symbol": symbol, "price": last, "price_change_percent": change}

        errors: list[str] = []
        for name, fetcher in [
            ("binance", self._fetch_binance_ticker),
            ("bybit", self._fetch_bybit_ticker),
            ("okx", self._fetch_okx_ticker),
        ]:
            try:
                return fetcher(symbol)
            except Exception as exc:
                errors.append(f"{name}: {exc}")
        raise MarketDataError(f"failed to fetch realtime exchange ticker ({'; '.join(errors)})")

    def get_price_decimal(self, symbol: str) -> Decimal:
        ticker = self.get_ticker(symbol)
        return Decimal(str(ticker["price"]))

    def _kline_fetchers(self, interval: str) -> list[tuple[str, Callable[[str, str, int], list[dict[str, float | int]]]]]:
        if interval == "10m":
            return [
                ("binance", self._fetch_binance_aggregated_klines),
                ("bybit", self._fetch_bybit_aggregated_klines),
                ("okx", self._fetch_okx_aggregated_klines),
            ]
        return [
            ("binance", self._fetch_binance_klines),
            ("bybit", self._fetch_bybit_klines),
            ("okx", self._fetch_okx_klines),
        ]

    def _fetch_binance_ticker(self, symbol: str) -> dict[str, float | str]:
        with httpx.Client(timeout=HTTP_TIMEOUT_SECONDS) as client:
            response = client.get(f"{BINANCE_BASE_URL}/api/v3/ticker/24hr", params={"symbol": symbol})
            response.raise_for_status()
            data = response.json()
        return {
            "symbol": symbol,
            "price": float(data["lastPrice"]),
            "price_change_percent": float(data["priceChangePercent"]),
        }

    def _fetch_bybit_ticker(self, symbol: str) -> dict[str, float | str]:
        with httpx.Client(timeout=HTTP_TIMEOUT_SECONDS) as client:
            response = client.get(
                f"{BYBIT_BASE_URL}/v5/market/tickers",
                params={"category": "spot", "symbol": symbol},
            )
            response.raise_for_status()
            data = response.json()
        row = data["result"]["list"][0]
        return {
            "symbol": symbol,
            "price": float(row["lastPrice"]),
            "price_change_percent": float(row["price24hPcnt"]) * 100,
        }

    def _fetch_okx_ticker(self, symbol: str) -> dict[str, float | str]:
        with httpx.Client(timeout=HTTP_TIMEOUT_SECONDS) as client:
            response = client.get(f"{OKX_BASE_URL}/api/v5/market/ticker", params={"instId": _okx_symbol(symbol)})
            response.raise_for_status()
            data = response.json()
        row = data["data"][0]
        last = float(row["last"])
        open_24h = float(row["open24h"])
        change = ((last - open_24h) / open_24h) * 100 if open_24h else 0.0
        return {"symbol": symbol, "price": last, "price_change_percent": change}

    def _fetch_binance_klines(self, symbol: str, interval: str, limit: int) -> list[dict[str, float | int]]:
        if interval not in NATIVE_BINANCE_INTERVALS:
            raise MarketDataError(f"binance unsupported interval: {interval}")
        with httpx.Client(timeout=HTTP_TIMEOUT_SECONDS) as client:
            response = client.get(
                f"{BINANCE_BASE_URL}/api/v3/klines",
                params={"symbol": symbol, "interval": interval, "limit": limit},
            )
            response.raise_for_status()
            rows = response.json()
        return [_binance_kline_to_dict(row) for row in rows]

    def _fetch_bybit_klines(self, symbol: str, interval: str, limit: int) -> list[dict[str, float | int]]:
        if interval not in NATIVE_BYBIT_INTERVALS:
            raise MarketDataError(f"bybit unsupported interval: {interval}")
        with httpx.Client(timeout=HTTP_TIMEOUT_SECONDS) as client:
            response = client.get(
                f"{BYBIT_BASE_URL}/v5/market/kline",
                params={"category": "spot", "symbol": symbol, "interval": BYBIT_INTERVAL_MAP[interval], "limit": limit},
            )
            response.raise_for_status()
            rows = response.json()["result"]["list"]
        return sorted((_bybit_kline_to_dict(row) for row in rows), key=lambda item: int(item["time"]))

    def _fetch_okx_klines(self, symbol: str, interval: str, limit: int) -> list[dict[str, float | int]]:
        if interval not in NATIVE_OKX_INTERVALS:
            raise MarketDataError(f"okx unsupported interval: {interval}")
        with httpx.Client(timeout=HTTP_TIMEOUT_SECONDS) as client:
            response = client.get(
                f"{OKX_BASE_URL}/api/v5/market/candles",
                params={"instId": _okx_symbol(symbol), "bar": OKX_INTERVAL_MAP[interval], "limit": min(limit, 300)},
            )
            response.raise_for_status()
            rows = response.json()["data"]
        return sorted((_okx_kline_to_dict(row) for row in rows), key=lambda item: int(item["time"]))

    def _fetch_binance_aggregated_klines(self, symbol: str, interval: str, limit: int) -> list[dict[str, float | int]]:
        source_limit = min(1000, limit * (SUPPORTED_INTERVALS[interval] // 60) + 5)
        one_minute = self._fetch_binance_klines(symbol, "1m", source_limit)
        return self._aggregate_klines(one_minute, SUPPORTED_INTERVALS[interval], limit)

    def _fetch_bybit_aggregated_klines(self, symbol: str, interval: str, limit: int) -> list[dict[str, float | int]]:
        source_limit = min(1000, limit * (SUPPORTED_INTERVALS[interval] // 60) + 5)
        one_minute = self._fetch_bybit_klines(symbol, "1m", source_limit)
        return self._aggregate_klines(one_minute, SUPPORTED_INTERVALS[interval], limit)

    def _fetch_okx_aggregated_klines(self, symbol: str, interval: str, limit: int) -> list[dict[str, float | int]]:
        source_limit = min(300, limit * (SUPPORTED_INTERVALS[interval] // 60) + 5)
        one_minute = self._fetch_okx_klines(symbol, "1m", source_limit)
        return self._aggregate_klines(one_minute, SUPPORTED_INTERVALS[interval], limit)

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
