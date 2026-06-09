import type { Language, Translations } from '../i18n';
import type { ContractOrder } from '../types';
import { formatDateTime, formatMoney, formatPrice } from '../utils';

interface HistoryOrdersTableProps {
  orders: ContractOrder[];
  loading: boolean;
  language: Language;
  t: Translations;
}

export function HistoryOrdersTable({ orders, loading, language, t }: HistoryOrdersTableProps) {
  return (
    <section className="panel table-panel">
      <div className="panel-head compact">
        <div>
          <p className="eyebrow">{t.ledger}</p>
          <h2>{t.history}</h2>
        </div>
        {loading && <span className="muted">{t.loading}</span>}
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{t.id}</th>
              <th>{t.symbol}</th>
              <th>{t.side}</th>
              <th>{t.stake}</th>
              <th>{t.entry}</th>
              <th>{t.close}</th>
              <th>{t.status}</th>
              <th>{t.profitLoss}</th>
              <th>{t.settled}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id}>
                <td>#{order.id}</td>
                <td>{order.symbol}</td>
                <td>{order.direction === 'CALL' ? '涨' : '跌'}</td>
                <td>{formatMoney(order.stake_amount)}</td>
                <td>{formatPrice(order.entry_price)}</td>
                <td>{order.close_price ? formatPrice(order.close_price) : '--'}</td>
                <td><span className={`badge status-${order.status.toLowerCase()}`}>{t.statusText[order.status]}</span></td>
                <td className={order.profit_loss >= 0 ? 'positive' : 'negative'}>{formatMoney(order.profit_loss)}</td>
                <td>{order.settled_at ? formatDateTime(order.settled_at, language) : '--'}</td>
              </tr>
            ))}
            {!orders.length && !loading && (
              <tr><td colSpan={9} className="empty-cell">{t.noHistory}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
