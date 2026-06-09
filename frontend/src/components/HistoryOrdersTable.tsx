import { useMemo, useState } from 'react';
import type { Language, Translations } from '../i18n';
import type { ContractOrder, OrderStatus } from '../types';
import { formatDateTime, formatMoney, formatPrice } from '../utils';

interface HistoryOrdersTableProps {
  orders: ContractOrder[];
  loading: boolean;
  language: Language;
  t: Translations;
}

type HistoryFilter = 'ALL' | Extract<OrderStatus, 'WON' | 'LOST' | 'DRAW'>;

const filters: { key: HistoryFilter; label: string }[] = [
  { key: 'ALL', label: '全部' },
  { key: 'WON', label: '胜单' },
  { key: 'LOST', label: '负单' },
  { key: 'DRAW', label: '平局' },
];

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

function resultSummary(order: ContractOrder, t: Translations): string {
  return `${t.statusText[order.status]} ${order.profit_loss >= 0 ? '+' : ''}${formatMoney(order.profit_loss)}`;
}

export function HistoryOrdersTable({ orders, loading, language, t }: HistoryOrdersTableProps) {
  const [filter, setFilter] = useState<HistoryFilter>('ALL');
  const filteredOrders = useMemo(
    () => filter === 'ALL' ? orders : orders.filter(order => order.status === filter),
    [filter, orders],
  );

  return (
    <section className="panel table-panel history-panel">
      <div className="panel-head compact history-head">
        <div>
          <p className="eyebrow">{t.ledger}</p>
          <h2>{t.history}</h2>
        </div>
        {loading && <span className="muted">{t.loading}</span>}
      </div>
      <div className="history-filter-row">
        {filters.map(item => (
          <button key={item.key} className={filter === item.key ? 'chip active' : 'chip'} type="button" onClick={() => setFilter(item.key)}>
            {item.label}
          </button>
        ))}
      </div>
      <div className="table-scroll">
        <table className="history-table">
          <thead>
            <tr>
              <th>结果</th>
              <th>{t.id}</th>
              <th>{t.symbol}</th>
              <th>{t.side}</th>
              <th>{t.stake}</th>
              <th>{t.entry}</th>
              <th>{t.close}</th>
              <th>价差</th>
              <th>胜负原因</th>
              <th>{t.settled}</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(order => {
              const diff = priceDiff(order);
              return (
                <tr key={order.id}>
                  <td><span className={`result-pill status-${order.status.toLowerCase()}`}>{resultSummary(order, t)}</span></td>
                  <td>#{order.id}</td>
                  <td>{order.symbol}</td>
                  <td>{order.direction === 'CALL' ? '涨' : '跌'}</td>
                  <td>{formatMoney(order.stake_amount)}</td>
                  <td>{formatPrice(order.entry_price)}</td>
                  <td>{order.close_price ? formatPrice(order.close_price) : '--'}</td>
                  <td className={(diff ?? 0) >= 0 ? 'positive' : 'negative'}>{diff === null ? '--' : formatPrice(diff)}</td>
                  <td className="reason-cell">{settlementReason(order)}</td>
                  <td>{order.settled_at ? formatDateTime(order.settled_at, language) : '--'}</td>
                </tr>
              );
            })}
            {!filteredOrders.length && !loading && (
              <tr><td colSpan={10} className="empty-cell">{filter === 'ALL' ? t.noHistory : '当前筛选暂无订单'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
