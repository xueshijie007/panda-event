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

const intervals: ContractInterval[] = ['3m', '5m', '10m', '15m', '1h'];
const quickAmounts = [10, 50, 100];

export function OrderPanel({ symbol, interval, balance, submitting, language, t, onIntervalChange, onSubmit }: OrderPanelProps) {
  const [direction, setDirection] = useState<Direction>('CALL');
  const [stake, setStake] = useState('10');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const expiry = useMemo(() => new Date(now + intervalToMs(interval)).toISOString(), [now, interval]);
  const stakeNumber = Number(stake);
  const invalidStake = !Number.isFinite(stakeNumber) || stakeNumber < 1 || stakeNumber > balance;

  async function submit() {
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

      <label className="field">
        <span>{t.direction}</span>
        <div className="direction-grid">
          <button className={direction === 'CALL' ? 'direction call active' : 'direction call'} onClick={() => setDirection('CALL')}>
            {t.callUp}
          </button>
          <button className={direction === 'PUT' ? 'direction put active' : 'direction put'} onClick={() => setDirection('PUT')}>
            {t.putDown}
          </button>
        </div>
      </label>

      <label className="field">
        <span>{t.settlementCycle}</span>
        <select value={interval} onChange={event => onIntervalChange(event.target.value as ContractInterval)}>
          {intervals.map(item => <option value={item} key={item}>{item}</option>)}
        </select>
      </label>

      <label className="field">
        <span>{t.stakeAmount}</span>
        <input value={stake} type="number" min="1" step="0.01" onChange={event => setStake(event.target.value)} />
      </label>
      <div className="amount-row">
        {quickAmounts.map(amount => (
          <button key={amount} className="chip" onClick={() => setStake(String(amount))}>{amount}</button>
        ))}
      </div>

      <div className="order-summary">
        <div><span>{t.symbol}</span><strong>{symbol}</strong></div>
        <div><span>{t.expiry}</span><strong>{formatDateTime(expiry, language)}</strong></div>
        <div><span>{t.payout}</span><strong>80%</strong></div>
      </div>

      {invalidStake && <p className="form-error">{t.invalidStake}</p>}
      <button className="primary-action" disabled={invalidStake || submitting} onClick={submit}>
        {submitting ? t.submitting : t.confirmOrder}
      </button>
    </section>
  );
}

