import { useMemo, useState } from 'react';
import { useCandles } from '../hooks/useCandles';
import { useSpotGold } from '../hooks/useSpotGold';
import { useZlmaSignalAlert } from '../hooks/useZlmaSignalAlert';
import { CandlestickChart, ChartOverlay } from './CandlestickChart';
import { computeZlmaTrend } from '../utils/zlmaTrend';

const POLL_MS = 15_000;
const CANDLE_COUNT = 200;

// ZLMA Trend Levels [ChartPrime] inputs + palette.
const ZLMA_LENGTH = 15;
const ATR_LENGTH = 200;
const UP_COLOR = '#30d453';
const DN_COLOR = '#4043f1';

const formatUsd = (value: number): string =>
  value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatRelative = (ms: number): string => {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

export const GoldPage = () => {
  const [signalAlertsEnabled, setSignalAlertsEnabled] = useState(false);
  const { candles, loading, error, lastUpdated, refresh } = useCandles(
    '5m',
    CANDLE_COUNT,
    POLL_MS,
  );
  const spot = useSpotGold(POLL_MS);

  const trend = useMemo(
    () => computeZlmaTrend(candles, ZLMA_LENGTH, ATR_LENGTH),
    [candles],
  );

  const overlay = useMemo<ChartOverlay | undefined>(() => {
    if (candles.length === 0) return undefined;
    return {
      zlma: trend.zlma,
      ema: trend.ema,
      signals: trend.signals,
      boxes: trend.boxes,
      upColor: UP_COLOR,
      dnColor: DN_COLOR,
    };
  }, [candles.length, trend]);

  const signalAlert = useZlmaSignalAlert(trend.signals, signalAlertsEnabled);

  const handleToggleSignalAlerts = async () => {
    if (signalAlertsEnabled) {
      setSignalAlertsEnabled(false);
      return;
    }
    let perm = signalAlert.permission;
    if (perm === 'default') {
      perm = await signalAlert.requestPermission();
    }
    if (perm === 'granted') {
      setSignalAlertsEnabled(true);
      await signalAlert.sendTestNotification();
    }
  };

  const stats = useMemo(() => {
    if (candles.length === 0) return null;
    const last = candles[candles.length - 1];
    const high = Math.max(...candles.map((c) => c.high));
    const low = Math.min(...candles.map((c) => c.low));
    return { last, high, low };
  }, [candles]);

  const spread = useMemo(() => {
    if (!stats || !spot.spot) return null;
    const diff = stats.last.close - spot.spot.price;
    const diffPct = spot.spot.price > 0 ? (diff / spot.spot.price) * 100 : 0;
    return { diff, diffPct };
  }, [stats, spot.spot]);

  const latestSignal = trend.signals[trend.signals.length - 1] ?? null;

  const handleRefresh = () => {
    refresh();
    spot.refresh();
  };

  return (
    <>
      <section className="card">
        <div className="section-header">
          <div>
            <h2>Gold (PAXG/USDT) · 5M</h2>
            <p className="muted">
              PAXG/USDT 5-minute candles from Binance, polled every {POLL_MS / 1000}s, with the
              Zero-Lag MA Trend Levels overlay (ZLMA {ZLMA_LENGTH} vs EMA {ZLMA_LENGTH},
              ATR {ATR_LENGTH} levels). XAU spot shown separately for reference.
            </p>
          </div>
          <div className="section-actions">
            <button
              type="button"
              className="button button--ghost"
              onClick={handleRefresh}
              disabled={loading || spot.loading}
            >
              {loading || spot.loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className="alert-bar">
          <div>
            <strong>Trend signal alert (ZLMA × EMA)</strong>
            <p className="muted small" style={{ margin: '4px 0 0' }}>
              {!signalAlert.supported
                ? signalAlert.unsupportedReason
                : signalAlertsEnabled
                ? latestSignal
                  ? `Watching closed 5M candles. Latest signal: ${
                      latestSignal.type === 'up' ? 'bullish ▲ crossover' : 'bearish ▼ crossunder'
                    } at USD ${formatUsd(latestSignal.close)}.`
                  : 'Watching closed 5M candles. No crossover yet in this window.'
                : signalAlert.permission === 'denied'
                ? 'Notifications are blocked in browser settings.'
                : 'Enable to get a desktop ping when ZLMA crosses EMA (up or down) on a closed 5M candle.'}
            </p>
            {signalAlert.lastAlert?.close !== undefined && (
              <p className="small" style={{ margin: '6px 0 0' }}>
                Last alert: {signalAlert.lastAlert.type === 'up' ? 'bullish ▲' : 'bearish ▼'} at USD{' '}
                {formatUsd(signalAlert.lastAlert.close)} · {signalAlert.lastAlert.message}
              </p>
            )}
            {signalAlert.lastTest && (
              <p className="small" style={{ margin: '6px 0 0' }}>
                Test: {signalAlert.lastTest.message}
              </p>
            )}
          </div>
          <div className="section-actions">
            {signalAlertsEnabled && signalAlert.permission === 'granted' && (
              <button
                type="button"
                className="button button--ghost"
                onClick={signalAlert.sendTestNotification}
              >
                Test
              </button>
            )}
            <button
              type="button"
              className="button"
              onClick={handleToggleSignalAlerts}
              disabled={!signalAlert.supported || signalAlert.permission === 'denied'}
            >
              {signalAlertsEnabled ? 'Disable alerts' : 'Enable alerts'}
            </button>
          </div>
        </div>

        {(stats || spot.spot) && (
          <div className="summary-grid" style={{ marginBottom: 18 }}>
            {stats && (
              <div className="card metric">
                <span className="metric-label">PAXG Last</span>
                <span className="metric-value">USD {formatUsd(stats.last.close)}</span>
                <span className="metric-change muted small">
                  {formatRelative(Date.now() - stats.last.time)}
                </span>
              </div>
            )}
            {latestSignal && (
              <div
                className={`card metric ${
                  latestSignal.type === 'up' ? 'metric--positive' : 'metric--negative'
                }`}
              >
                <span className="metric-label">Trend Signal</span>
                <span className="metric-value">
                  {latestSignal.type === 'up' ? '▲ Bullish' : '▼ Bearish'}
                </span>
                <span className="metric-change muted small">
                  {formatRelative(Date.now() - latestSignal.time)} · USD{' '}
                  {formatUsd(latestSignal.close)}
                </span>
              </div>
            )}
            {spot.spot && (
              <div className="card metric">
                <span className="metric-label">XAU Spot</span>
                <span className="metric-value">USD {formatUsd(spot.spot.price)}</span>
                <span className="metric-change muted small">
                  {formatRelative(Date.now() - spot.spot.updatedAt)}
                </span>
              </div>
            )}
            {spread && (
              <div
                className={`card metric ${
                  spread.diff >= 0 ? 'metric--positive' : 'metric--negative'
                }`}
              >
                <span className="metric-label">PAXG − Spot</span>
                <span className="metric-value">
                  {spread.diff >= 0 ? '+' : ''}
                  USD {formatUsd(spread.diff)}
                </span>
                <span className="metric-change">
                  {spread.diffPct >= 0 ? '+' : ''}
                  {spread.diffPct.toFixed(3)}%
                </span>
              </div>
            )}
          </div>
        )}

        {(error || spot.error) && (
          <div className="banner banner--error" role="alert" style={{ marginBottom: 16 }}>
            <span>{error ?? spot.error}</span>
            <button
              type="button"
              className="banner-close"
              onClick={handleRefresh}
              aria-label="Retry"
            >
              ↻
            </button>
          </div>
        )}

        {loading && candles.length === 0 ? (
          <div className="empty-state">
            <p className="muted">Loading PAXG/USDT candles…</p>
          </div>
        ) : candles.length === 0 ? (
          <div className="empty-state">
            <p className="muted">No candle data available.</p>
          </div>
        ) : (
          <CandlestickChart candles={candles} overlay={overlay} />
        )}

        {lastUpdated && (
          <p className="muted small" style={{ marginTop: 12 }}>
            Updated {new Date(lastUpdated).toLocaleTimeString()} · {candles.length} × 5M candles ·{' '}
            {trend.signals.length} signals in window
          </p>
        )}
      </section>

      <footer className="footer muted small">
        Source: Binance PAXG/USDT klines · Spot XAU from gold-api.com · ZLMA Trend Levels indicator
        by ChartPrime.
      </footer>
    </>
  );
};
