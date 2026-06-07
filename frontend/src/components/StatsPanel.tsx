import type { Translations } from '../i18n';
import type { ContractStats } from '../types';
import { formatMoney } from '../utils';

interface StatsPanelProps {
  stats: ContractStats | null;
  t: Translations;
}

export function StatsPanel({ stats, t }: StatsPanelProps) {
  const safe = stats ?? {
    total_trades: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    win_rate: 0,
    total_profit_loss: 0,
    max_loss: 0,
    consecutive_losses: 0,
  };

  return (
    <section className="stats-grid">
      <div className="stat-card"><span>{t.totalTrades}</span><strong>{safe.total_trades}</strong></div>
      <div className="stat-card"><span>{t.winRate}</span><strong>{safe.win_rate.toFixed(2)}%</strong></div>
      <div className="stat-card"><span>{t.totalPL}</span><strong className={safe.total_profit_loss >= 0 ? 'positive' : 'negative'}>{formatMoney(safe.total_profit_loss)}</strong></div>
      <div className="stat-card"><span>{t.maxLoss}</span><strong className="negative">{formatMoney(safe.max_loss)}</strong></div>
      <div className="stat-card"><span>{t.currentLossStreak}</span><strong>{safe.consecutive_losses}</strong></div>
    </section>
  );
}
