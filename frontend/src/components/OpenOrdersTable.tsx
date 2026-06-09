import { useEffect, useState } from 'react';
import type { Language, Translations } from '../i18n';
import type { ContractOrder, Ticker } from '../types';
import { countdown, formatDateTime, formatMoney, formatPrice } from '../utils';

interface OpenOrdersTableProps {
  orders: ContractOrder[];
  loading: boolean;
  language: Language;
  ticker: Ticker | null;
  t: Translations;
}

function floatingState(order: ContractOrder, currentPrice: number | null): { diff: number | null; label: string; className: string } {
  if (currentPrice === null) return { diff: null, label: '--', className: '' };
  const diff = currentPrice - order.entry_price;
  if (diff === 0) return { diff, label: '暂时平', className: 'draw' };
  const winning = order.direction === 'CALL' ? diff > 0 : diff < 0;
  return { diff, label: winning ? '暂时胜' : '暂时负', className: winning ? 'winning' : 'losing' };
}

export function OpenOrdersTable({ orders, loading, language, ticker, t }: OpenOrdersTableProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setTick(value => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="panel table-panel open-orders-panel">
      <div className="panel-head compact">
        <div>
          <p className="eyebrow">{t.positions}</p>
          <h2>{t.openOrders}</h2>
        </div>
        {loading && <span className="muted">{t.loading}</span>}
      </div>
      <div className="open-order-scroll">
        {orders.map(order => {
          const currentPrice = ticker?.symbol === order.symbol ? ticker.price : null;
          const state = floatingState(order, currentPrice);
          return (
            <article className={order.direction === 'CALL' ? 'open-order-card call' : 'open-order-card put'} key={order.id}>
              <div className="open-order-top">
                <div>
                  <span className="muted">#{order.id}</span>
                  <strong>{order.symbol}</strong>
                </div>
                <span className={order.direction === 'CALL' ? 'badge call-badge' : 'badge put-badge'}>{order.direction === 'CALL' ? '涨' : '跌'}</span>
              </div>
              <div className="open-order-meta">
                <span>{order.interval}</span>
                <span>{formatMoney(order.stake_amount)} USDT</span>
                <span>{countdown(order.expiry_time, t)}</span>
              </div>
              <dl className="open-order-prices">
                <div><dt>开仓价</dt><dd>{formatPrice(order.entry_price)}</dd></div>
                <div><dt>当前价</dt><dd>{currentPrice === null ? '--' : formatPrice(currentPrice)}</dd></div>
                <div><dt>浮动价差</dt><dd className={(state.diff ?? 0) >= 0 ? 'positive' : 'negative'}>{state.diff === null ? '--' : formatPrice(state.diff)}</dd></div>
                <div><dt>当前状态</dt><dd className={`floating-state ${state.className}`}>{state.label}</dd></div>
              </dl>
              <div className="open-order-expiry">
                <span>到期时间</span>
                <strong>{formatDateTime(order.expiry_time, language)}</strong>
              </div>
            </article>
          );
        })}
        {!orders.length && !loading && <div className="empty-card">{t.noOpenOrders}</div>}
      </div>
    </section>
  );
}
