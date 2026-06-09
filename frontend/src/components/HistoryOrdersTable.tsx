import type { Language, Translations } from '../i18n';
import type { ContractOrder } from '../types';
import { formatDateTime, formatMoney, formatPrice } from '../utils';

interface HistoryOrdersTableProps {
  orders: ContractOrder[];
  loading: boolean;
  language: Language;
  t: Translations;
}

function priceDiff(order: ContractOrder): number | null {
  if (order.close_price === null) return null;
  return order.close_price - order.entry_price;
}

function settlementReason(order: ContractOrder): string {
  if (order.close_price === null) return '--';
  const side = order.direction === 'CALL' ? '涨单' : '跌单';
  const comparison = order.close_price > order.entry_price
    ? '结算价高于开仓价'
    : order.close_price < order.entry_price
      ? '结算价低于开仓价'
      : '结算价等于开仓价';
  if (order.status === 'WON') return `${side}，${comparison}，胜`;
  if (order.status === 'LOST') return `${side}，${comparison}，负`;
  if (order.status === 'DRAW') return `${side}，${comparison}，平`;
  return `${side}，${comparison}`;
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
              <th>价差</th>
              <th>{t.status}</th>
              <th>{t.profitLoss}</th>
              <th>胜负原因</th>
              <th>{t.settled}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => {
              const diff = priceDiff(order);
              return (
                <tr key={order.id}>
                  <td>#{order.id}</td>
                  <td>{order.symbol}</td>
                  <td>{order.direction === 'CALL' ? '涨' : '跌'}</td>
                  <td>{formatMoney(order.stake_amount)}</td>
                  <td>{formatPrice(order.entry_price)}</td>
                  <td>{order.close_price ? formatPrice(order.close_price) : '--'}</td>
                  <td className={(diff ?? 0) >= 0 ? 'positive' : 'negative'}>{diff === null ? '--' : formatPrice(diff)}</td>
                  <td><span className={`badge status-${order.status.toLowerCase()}`}>{t.statusText[order.status]}</span></td>
                  <td className={order.profit_loss >= 0 ? 'positive' : 'negative'}>{formatMoney(order.profit_loss)}</td>
                  <td className="reason-cell">{settlementReason(order)}</td>
                  <td>{order.settled_at ? formatDateTime(order.settled_at, language) : '--'}</td>
                </tr>
              );
            })}
            {!orders.length && !loading && (
              <tr><td colSpan={11} className="empty-cell">{t.noHistory}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
