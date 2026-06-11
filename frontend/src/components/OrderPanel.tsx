import { useEffect, useMemo, useState } from 'react';
import type { Language, Translations } from '../i18n';
import type { ContractInterval, Direction, OpenContractPayload, SymbolName } from '../types';
import { formatDateTime, intervalToMs } from '../utils';

interface OrderPanelProps {
  symbol: SymbolName;
  interval: ContractInterval;
  balance: number;
  submitting: boolean;
  language: Language;
  t: Translations;
  onIntervalChange: (interval: ContractInterval) => void;
  onSubmit: (payload: OpenContractPayload) => Promise<void>;
}

const intervals: ContractInterval[] = ['1m', '3m', '5m', '10m', '15m', '1h'];
const quickAmounts = [10, 50, 100];
const mobileQuickAmounts = [5, 20, 100, 200];
const payoutRatios: Record<ContractInterval, number> = {
  '1m': 60,
  '3m': 64,
  '5m': 67,
  '10m': 70,
  '15m': 72,
  '1h': 75,
};

export function OrderPanel({ symbol, interval, balance, submitting, language, t, onIntervalChange, onSubmit }: OrderPanelProps) {
  const [stake, setStake] = useState('10');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const expiry = useMemo(() => new Date(now + intervalToMs(interval)).toISOString(), [now, interval]);
  const stakeNumber = Number(stake);
  const invalidStake = !Number.isFinite(stakeNumber) || stakeNumber < 1 || stakeNumber > balance;

  async function submit(direction: Direction) {
    if (invalidStake || submitting) return;
    await onSubmit({ symbol, interval, direction, stake_amount: stake });
  }

  return (
    <section className="panel order-panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">{t.eventContract}</p>
          <h2>{t.openPosition}</h2>
        </div>
      </div>

      <label className="field cycle-field">
        <span>{t.settlementCycle}</span>
        <select value={interval} onChange={event => onIntervalChange(event.target.value as ContractInterval)}>
          {intervals.map(item => <option value={item} key={item}>{item}</option>)}
        </select>
      </label>
      <div className="mobile-contract-intervals" aria-label={t.settlementCycle}>
        {intervals.map(item => (
          <button
            key={item}
            className={item === interval ? 'chip active' : 'chip'}
            type="button"
            onClick={() => onIntervalChange(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <label className="field stake-field">
        <span>{t.stakeAmount}</span>
        <input value={stake} type="number" min="1" step="0.01" onChange={event => setStake(event.target.value)} />
      </label>
      <div className="amount-row">
        {quickAmounts.map(amount => (
          <button key={amount} className="chip" type="button" onClick={() => setStake(String(amount))}>{amount}</button>
        ))}
      </div>
      <div className="mobile-amount-row">
        {mobileQuickAmounts.map(amount => (
          <button key={amount} className="chip" type="button" onClick={() => setStake(String(amount))}>{amount}</button>
        ))}
        <button className="chip" type="button" onClick={() => setStake(String(Math.max(1, Math.floor(balance))))}>最大</button>
      </div>

      <div className="order-summary">
        <div><span>{t.symbol}</span><strong>{symbol}</strong></div>
        <div><span>{t.expiry}</span><strong>{formatDateTime(expiry, language)}</strong></div>
        <div><span>{t.payout}</span><strong>{payoutRatios[interval]}%</strong></div>
      </div>

      {invalidStake && <p className="form-error">{t.invalidStake}</p>}
      <div className="instant-order-grid">
        <button className="instant-order call" disabled={invalidStake || submitting} onClick={() => submit('CALL')}>
          <span>{submitting ? t.submitting : t.callUp}</span>
          <strong>{t.confirmOrder}</strong>
        </button>
        <button className="instant-order put" disabled={invalidStake || submitting} onClick={() => submit('PUT')}>
          <span>{submitting ? t.submitting : t.putDown}</span>
          <strong>{t.confirmOrder}</strong>
        </button>
      </div>
    </section>
  );
}
