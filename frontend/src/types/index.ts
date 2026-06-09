export type SymbolName = 'BTCUSDT' | 'ETHUSDT';
export type ChartInterval = '1m' | '3m' | '5m' | '10m' | '15m' | '1h';
export type ContractInterval = '1m' | '3m' | '5m' | '10m' | '15m' | '1h';
export type Interval = ChartInterval;
export type Direction = 'CALL' | 'PUT';
export type OrderStatus = 'OPEN' | 'WON' | 'LOST' | 'DRAW' | 'CANCELLED';

export interface User {
  id: number;
  username: string;
  contact_type: 'wechat' | 'qq' | null;
  contact_account: string | null;
  exchange_uid: string | null;
  review_status: 'pending' | 'approved' | 'rejected';
  balance: number;
  created_at: string;
  reviewed_at: string | null;
}

export interface ReviewStatus {
  username: string;
  review_status: 'not_found' | 'pending' | 'approved' | 'rejected';
  exchange_uid: string | null;
  reviewed_at: string | null;
}

export interface Kline {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Ticker {
  symbol: SymbolName;
  price: number;
  price_change_percent: number;
}

export interface ContractOrder {
  id: number;
  user_id: number;
  symbol: SymbolName;
  interval: ContractInterval;
  direction: Direction;
  stake_amount: number;
  entry_price: number;
  close_price: number | null;
  payout_ratio: number;
  status: OrderStatus;
  opened_at: string;
  expiry_time: string;
  settled_at: string | null;
  profit_loss: number;
}

export interface ContractStats {
  total_trades: number;
  wins: number;
  losses: number;
  draws: number;
  win_rate: number;
  total_profit_loss: number;
  max_loss: number;
  consecutive_losses: number;
}

export interface OpenContractPayload {
  symbol: SymbolName;
  interval: ContractInterval;
  direction: Direction;
  stake_amount: string;
}

export interface RegisterPayload {
  username: string;
  password: string;
  contact_type: 'wechat' | 'qq';
  contact_account: string;
  exchange_uid: string;
}
