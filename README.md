# Crypto Event Contract Simulator

A local-only MVP for simulated BTC/ETH event contract trading.

This project does not connect to real wallets, real deposits, withdrawals, KYC, or exchange order placement. All balances, orders, profit, and loss are virtual.

## Features

- React + Vite + TypeScript frontend.
- FastAPI + Python backend.
- SQLite local database.
- BTCUSDT and ETHUSDT market view.
- Candlestick chart using `lightweight-charts`.
- Chart intervals: `1m`, `3m`, `5m`, `10m`, `15m`, `1h`.
- Event contract cycles: `3m`, `5m`, `10m`, `15m`, `1h`.
- Market data adapter with Binance public API first and mock-data fallback.
- `10m` candles are aggregated from `1m` candles.
- Account registration/login with password, contact info, exchange UID, and 10,000 virtual USDT default balance.
- Simulated CALL/PUT event contracts.
- Automatic background settlement every 3 seconds.
- Open orders, history, win rate, total P/L, max loss, and loss streak.

## Project Structure

```text
crypto-event-contract-platform/
  backend/
    app/
      main.py
      database.py
      models.py
      schemas.py
      services/
        market_service.py
        contract_service.py
        settlement_service.py
      routers/
        market.py
        contracts.py
        users.py
    requirements.txt
    .env.example
  frontend/
    src/
      main.tsx
      App.tsx
      api/
        client.ts
      components/
        ChartPanel.tsx
        OrderPanel.tsx
        OpenOrdersTable.tsx
        HistoryOrdersTable.tsx
        StatsPanel.tsx
      types/
        index.ts
    package.json
    vite.config.ts
    .env.example
  README.md
```

## Backend Setup

Use Python 3.11+.

```bash
cd crypto-event-contract-platform/backend
python -m venv .venv
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The SQLite database is created automatically at `backend/simulator.db` unless `DATABASE_URL` is set.

If the chart keeps showing loading because Binance is slow or unreachable from your network, start the backend with mock market data:

```powershell
cd crypto-event-contract-platform/backend
$env:MARKET_DATA_MODE="mock"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

You can also keep exchange mode but reduce fallback latency:

```powershell
$env:MARKET_HTTP_TIMEOUT="1.0"
```

## Frontend Setup

Use Node.js 20+.

```bash
cd crypto-event-contract-platform/frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

## API Examples

```bash
curl http://localhost:8000/api/health
curl http://localhost:8000/api/market/symbols
curl "http://localhost:8000/api/market/klines?symbol=BTCUSDT&interval=1m&limit=200"
```

Login or create a local simulated user:

```bash
curl -X POST http://localhost:8000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","password":"demo123"}'
```

Open a simulated order. Replace `1` with the returned user id:

```bash
curl -X POST http://localhost:8000/api/contracts/open \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 1" \
  -d '{"symbol":"BTCUSDT","interval":"3m","direction":"CALL","stake_amount":"10"}'
```

Manual settlement scan for testing expired orders:

```bash
curl -X POST http://localhost:8000/api/contracts/settle/manual
```

## Event Contract Rules

- Minimum stake: 1 USDT.
- Maximum stake: current available virtual balance.
- Maximum open contracts per user: 10.
- Stake is deducted immediately when opening a contract.
- Expiry is calculated from open time plus the selected cycle.
- CALL wins when settlement close price is greater than entry price.
- PUT wins when settlement close price is less than entry price.
- Equal price is a draw and returns the stake.
- Default payout ratio is `0.8`.
- Example: stake 100 USDT and win, user receives 180 USDT back, net P/L is 80 USDT.
- Lose: no refund, net P/L is `-stake`.

## Notes For Extension

The service layer is intentionally separated for future additions:

- `market_service.py`: exchange adapters, mock fallback, and candle aggregation.
- `contract_service.py`: opening contracts, balance checks, stats.
- `settlement_service.py`: due-order scanning and settlement rules.

Good next extensions include strategy leaderboards, user leaderboards, and TradingView Webhook endpoints that create simulated event contracts only.

## Troubleshooting: Failed to fetch

`Failed to fetch` is a browser-side network/CORS error. Check these first:

1. Backend is running:

```powershell
curl http://localhost:8000/api/health
```

Expected response:

```json
{"status":"ok"}
```

2. If you open the frontend on the same computer, use:

```text
http://localhost:5173
```

3. In local Vite development, the frontend uses a `/api` proxy to `http://127.0.0.1:8000` by default. If you previously created `frontend/.env` with `VITE_API_BASE_URL=http://localhost:8000`, remove it or restart Vite after changing it.

4. If you serve the frontend without the Vite dev proxy, or you need the browser to call a LAN backend directly, create `frontend/.env`:

```env
VITE_API_BASE_URL=http://192.168.1.20:8000
```

Then restart the Vite dev server.

5. If your frontend origin is custom, set backend CORS before starting FastAPI:

```powershell
$env:CORS_ALLOW_ORIGINS="http://localhost:5173,http://127.0.0.1:5173,http://192.168.1.20:5173"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
