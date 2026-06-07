import { useEffect, useState } from 'react';
import type { Language, Translations } from '../i18n';
import type { ContractOrder } from '../types';
import { countdown, formatDateTime, formatMoney, formatPrice } from '../utils';

interface OpenOrdersTableProps {
  orders: ContractOrder[];
  loading: boolean;
  language: Language;
  t: Translations;
}

export function OpenOrdersTable({ orders, loading, language, t }: OpenOrdersTableProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setTick(value => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="panel table-panel">
      <div className="panel-head compact">
        <div>
          <p className="eyebrow">{t.positions}</p>
          <h2>{t.openOrders}</h2>
        </div>
        {loading && <span className="muted">{t.loading}</span>}
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{t.id}</th>
              <th>{t.symbol}</th>
              <th>{t.cycle}</th>
              <th>{t.side}</th>
              <th>{t.stake}</th>
              <th>{t.entry}</th>
              <th>{t.expiry}</th>
              <th>{t.countdown}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id}>
                <td>#{order.id}</td>
                <td>{order.symbol}</td>
                <td>{order.interval}</td>
                <td><span className={order.direction === 'CALL' ? 'badge call-badge' : 'badge put-badge'}>{order.direction}</span></td>
                <td>{formatMoney(order.stake_amount)}</td>
                <td>{formatPrice(order.entry_price)}</td>
                <td>{formatDateTime(order.expiry_time, language)}</td>
                <td>{countdown(order.expiry_time, t)}</td>
              </tr>
            ))}
            {!orders.length && !loading && (
              <tr><td colSpan={8} className="empty-cell">{t.noOpenOrders}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
