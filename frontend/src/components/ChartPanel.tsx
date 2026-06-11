import { createChart, LineStyle, TickMarkType, type CandlestickData, type IChartApi, type IPriceLine, type ISeriesApi, type Time, type UTCTimestamp } from 'lightweight-charts';
import { useEffect, useRef } from 'react';
import type { Translations } from '../i18n';
import type { ChartInterval, ContractOrder, Kline, SymbolName, Ticker } from '../types';
import { formatPrice } from '../utils';

interface ChartPanelProps {
  symbol: SymbolName;
  interval: ChartInterval;
  ticker: Ticker | null;
  klines: Kline[];
  openOrders: ContractOrder[];
  loading: boolean;
  t: Translations;
  onSymbolChange: (symbol: SymbolName) => void;
  onIntervalChange: (interval: ChartInterval) => void;
}

const symbols: SymbolName[] = ['BTCUSDT', 'ETHUSDT'];
const intervals: ChartInterval[] = ['1m', '3m', '5m', '10m', '15m', '1h'];
const chartTimeZone = 'Asia/Shanghai';

function timeToDate(time: Time): Date {
  if (typeof time === 'number') return new Date(time * 1000);
  if (typeof time === 'string') return new Date(time);
  return new Date(Date.UTC(time.year, time.month - 1, time.day));
}

function formatChartTick(time: Time, tickMarkType: TickMarkType): string {
  const date = timeToDate(time);
  if (tickMarkType === TickMarkType.Time || tickMarkType === TickMarkType.TimeWithSeconds) {
    return new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: chartTimeZone,
    }).format(date);
  }
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    timeZone: chartTimeZone,
  }).format(date);
}

function formatChartCrosshairTime(time: Time): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: chartTimeZone,
  }).format(timeToDate(time));
}

export function ChartPanel({ symbol, interval, ticker, klines, openOrders, loading, t, onSymbolChange, onIntervalChange }: ChartPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const priceLineRefs = useRef<Map<number, IPriceLine>>(new Map());
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
      localization: {
        locale: 'zh-CN',
        timeFormatter: formatChartCrosshairTime,
      },
      timeScale: {
        borderColor: 'rgba(142, 157, 179, 0.2)',
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: formatChartTick,
      },
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

    function applyResponsiveChartFrame(width: number, height: number) {
      const isMobile = width <= 680;
      chart.applyOptions({
        width,
        height,
        layout: {
          background: { color: isMobile ? '#ffffff' : '#10151f' },
          textColor: isMobile ? '#626a73' : '#c8d3e1',
        },
        grid: {
          vertLines: { color: isMobile ? 'rgba(18, 24, 32, 0.08)' : 'rgba(142, 157, 179, 0.08)' },
          horzLines: { color: isMobile ? 'rgba(18, 24, 32, 0.08)' : 'rgba(142, 157, 179, 0.08)' },
        },
        rightPriceScale: { borderColor: isMobile ? 'rgba(18, 24, 32, 0.12)' : 'rgba(142, 157, 179, 0.2)' },
        timeScale: { borderColor: isMobile ? 'rgba(18, 24, 32, 0.12)' : 'rgba(142, 157, 179, 0.2)' },
      });
    }

    const observer = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect;
      if (rect?.width) {
        applyResponsiveChartFrame(rect.width, rect.height || 430);
      }
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      priceLineRefs.current.clear();
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

  useEffect(() => {
    if (!seriesRef.current) return;
    const series = seriesRef.current;
    const visibleOrders = openOrders.filter(order => order.symbol === symbol);
    const visibleIds = new Set(visibleOrders.map(order => order.id));

    for (const [orderId, line] of priceLineRefs.current) {
      if (!visibleIds.has(orderId)) {
        series.removePriceLine(line);
        priceLineRefs.current.delete(orderId);
      }
    }

    for (const order of visibleOrders) {
      if (priceLineRefs.current.has(order.id)) continue;
      const isCall = order.direction === 'CALL';
      const line = series.createPriceLine({
        price: order.entry_price,
        color: isCall ? '#58f0a8' : '#ff5c7a',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `#${order.id} ${isCall ? '涨' : '跌'} 开仓价 ${formatPrice(order.entry_price)}`,
      });
      priceLineRefs.current.set(order.id, line);
    }
  }, [openOrders, symbol]);

  const change = displayTicker?.price_change_percent ?? 0;
  const positive = change >= 0;

  return (
    <section className="panel chart-panel">
      <div className="panel-head market-head">
        <div>
          <p className="eyebrow">{t.market}</p>
          <h2 className="market-title">
            <span>{symbol}</span>
            <strong>{displayTicker ? formatPrice(displayTicker.price) : '--'}</strong>
            <small className={positive ? 'positive' : 'negative'}>{positive ? '+' : ''}{change.toFixed(2)}%</small>
            <em className="live-tick">LIVE</em>
          </h2>
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

