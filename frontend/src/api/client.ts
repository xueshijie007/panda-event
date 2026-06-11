import type { ChartInterval, ContractOrder, ContractStats, Kline, OpenContractPayload, RegisterPayload, ReviewStatus, SymbolName, Ticker, User } from '../types';

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '');
const API_BASE_URL = configuredApiBaseUrl ?? '';

async function request<T>(path: string, options: RequestInit = {}, userId?: number): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (userId) {
    headers.set('X-User-Id', String(userId));
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error('无法连接后端 API。请确认后端运行在 http://127.0.0.1:8000，或检查 VITE_API_BASE_URL 配置。');
  }
  if (!response.ok) {
    let detail = `Request failed: ${response.status}`;
    try {
      const body = await response.json();
      detail = body.detail ?? detail;
    } catch {
      // Keep the fallback status message.
    }
    throw new Error(detail);
  }
  return response.json() as Promise<T>;
}

async function adminRequest<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('Authorization', `Bearer ${token}`);
  return request<T>(path, { ...options, headers });
}

function numericOrder(order: ContractOrder): ContractOrder {
  return {
    ...order,
    stake_amount: Number(order.stake_amount),
    entry_price: Number(order.entry_price),
    close_price: order.close_price === null ? null : Number(order.close_price),
    payout_ratio: Number(order.payout_ratio),
    profit_loss: Number(order.profit_loss),
  };
}

export const api = {
  login(username: string, password: string) {
    return request<User>('/api/users/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },
  register(payload: RegisterPayload) {
    return request<User>('/api/users/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getReviewStatus(username: string) {
    return request<ReviewStatus>(`/api/users/review-status?username=${encodeURIComponent(username)}`);
  },
  adminLogin(username: string, password: string) {
    return request<{ token: string }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },
  getAdminUsers(token: string, statusFilter = 'pending') {
    return adminRequest<User[]>(`/api/admin/users?status_filter=${statusFilter}`, token);
  },
  approveUser(token: string, userId: number) {
    return adminRequest<User>(`/api/admin/users/${userId}/approve`, token, { method: 'POST' });
  },
  rejectUser(token: string, userId: number) {
    return adminRequest<User>(`/api/admin/users/${userId}/reject`, token, { method: 'POST' });
  },
  approveReset(token: string, userId: number) {
    return adminRequest<User>(`/api/admin/users/${userId}/reset/approve`, token, { method: 'POST' });
  },
  rejectReset(token: string, userId: number) {
    return adminRequest<User>(`/api/admin/users/${userId}/reset/reject`, token, { method: 'POST' });
  },
  getMe(userId: number) {
    return request<User>(`/api/users/me?user_id=${userId}`);
  },
  getSymbols() {
    return request<SymbolName[]>('/api/market/symbols');
  },
  getKlines(symbol: SymbolName, interval: ChartInterval, limit = 200) {
    return request<Kline[]>(`/api/market/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
  },
  getTicker(symbol: SymbolName) {
    return request<Ticker>(`/api/market/ticker?symbol=${symbol}`);
  },
  async openContract(userId: number, payload: OpenContractPayload) {
    const order = await request<ContractOrder>('/api/contracts/open', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, userId);
    return numericOrder(order);
  },
  async getOpenOrders(userId: number) {
    const orders = await request<ContractOrder[]>('/api/contracts/open', {}, userId);
    return orders.map(numericOrder);
  },
  async getHistory(userId: number) {
    const orders = await request<ContractOrder[]>('/api/contracts/history', {}, userId);
    return orders.map(numericOrder);
  },
  getStats(userId: number) {
    return request<ContractStats>('/api/contracts/stats', {}, userId);
  },
  resetAccount(userId: number) {
    return request<User>('/api/contracts/reset', { method: 'POST' }, userId);
  },
  settleManual() {
    return request<{ settled: number }>('/api/contracts/settle/manual', { method: 'POST' });
  },
};




