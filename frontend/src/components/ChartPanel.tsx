import { createChart, type CandlestickData, type IChartApi, type ISeriesApi, type UTCTimestamp } from 'lightweight-charts';
import { useEffect, useRef } from 'react';
import type { Translations } from '../i18n';
import type { ChartInterval, Kline, SymbolName, Ticker } from '../types';
import { formatPrice } from '../utils';

interface ChartPanelProps {
  symbol: SymbolName;
  interval: ChartInterval;
  ticker: Ticker | null;
  klines: Kline[];
  loading: boolean;
  t: Translations;
  onSymbolChange: (symbol: SymbolName) => void;
  onIntervalChange: (interval: ChartInterval) => void;
}

const symbols: SymbolName[] = ['BTCUSDT', 'ETHUSDT'];
const intervals: ChartInterval[] = ['1m', '3m', '5m', '10m', '15m', '1h'];

export function ChartPanel({ symbol, interval, ticker, klines, loading, t, onSymbolChange, onIntervalChange }: ChartPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const hadDataRef = useRef(false);
  const displayTicker = ticker?.symbol === symbol ? ticker : null;

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      height: 430,
      layout: {
        background: { color: '#10151f' },
        textColor: '#c8d3e1',
      },
      grid: {
        vertLines: { color: 'rgba(142, 157, 179, 0.08)' },
        horzLines: { color: 'rgba(142, 157, 179, 0.08)' },
      },
      rightPriceScale: { borderColor: 'rgba(142, 157, 179, 0.2)' },
      timeScale: { borderColor: 'rgba(142, 157, 179, 0.2)', timeVisible: true },
    });
    chartRef.current = chart;
    seriesRef.current = chart.addCandlestickSeries({
      upColor: '#2ee59d',
      downColor: '#ff5c7a',
      borderUpColor: '#2ee59d',
      borderDownColor: '#ff5c7a',
      wickUpColor: '#2ee59d',
      wickDownColor: '#ff5c7a',
    });

    const observer = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width;
      if (width) chart.applyOptions({ width });
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return;

    const data: CandlestickData[] = klines.map(item => ({
      time: item.time as UTCTimestamp,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));
    seriesRef.current.setData(data);

    // Fit only on first load or after interval/symbol switches. Re-fitting on every
    // refresh snaps the viewport and makes the chart feel laggy.
    if (data.length > 0 && !hadDataRef.current) {
      chartRef.current.timeScale().fitContent();
      hadDataRef.current = true;
    }
    if (data.length === 0) {
      hadDataRef.current = false;
    }
  }, [klines]);

  useEffect(() => {
    if (!seriesRef.current || !displayTicker || klines.length === 0) return;
    const last = klines[klines.length - 1];
    const liveClose = displayTicker.price;
    seriesRef.current.update({
      time: last.time as UTCTimestamp,
      open: last.open,
      high: Math.max(last.high, liveClose),
      low: Math.min(last.low, liveClose),
      close: liveClose,
    });
  }, [displayTicker, klines]);

  const change = displayTicker?.price_change_percent ?? 0;
  const positive = change >= 0;

  return (
    <section className="panel chart-panel">
      <div className="panel-head market-head">
        <div>
          <p className="eyebrow">{t.market}</p>
          <h2>{symbol}</h2>
        </div>
        <div className="price-card">
          <span className="muted">{t.lastPrice}</span>
          <strong>{displayTicker ? formatPrice(displayTicker.price) : '--'}</strong>
          <small className={positive ? 'positive' : 'negative'}>{positive ? '+' : ''}{change.toFixed(2)}%</small>
          <em className="live-tick">LIVE</em>
        </div>
      </div>

      <div className="switch-row">
        {symbols.map(item => (
          <button key={item} className={item === symbol ? 'chip active' : 'chip'} onClick={() => onSymbolChange(item)}>
            {item.replace('USDT', '')}
          </button>
        ))}
      </div>
      <div className="switch-row interval-row">
        {intervals.map(item => (
          <button key={item} className={item === interval ? 'chip active' : 'chip'} onClick={() => onIntervalChange(item)}>
            {item}
          </button>
        ))}
      </div>

      <div className="chart-wrap">
        {loading && klines.length > 0 && <span className="refreshing-pill">{t.updating}</span>}
        {loading && klines.length === 0 && <div className="loading-mask">{t.loadingMarket}</div>}
        <div ref={containerRef} className="chart-container" />
      </div>
    </section>
  );
}
