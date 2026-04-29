import { useMemo, useState } from 'react';
import { useCandles } from '../hooks/useCandles';
import { useSpotGold } from '../hooks/useSpotGold';
import { useGreenCandleAlert } from '../hooks/useGreenCandleAlert';
import { CandlestickChart } from './CandlestickChart';

const INTERVAL_MS = 15 * 60 * 1000;
const POLL_MS = 15_000;
const CANDLE_COUNT = 60;

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
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const { candles, loading, error, lastUpdated, refresh } = useCandles(
    '15m',
    CANDLE_COUNT,
    POLL_MS,
  );
  const spot = useSpotGold(POLL_MS);
  const alert = useGreenCandleAlert(candles, alertsEnabled, INTERVAL_MS);

  const handleToggleAlerts = async () => {
    if (alertsEnabled) {
      setAlertsEnabled(false);
      return;
    }
    let perm = alert.permission;
    if (perm === 'default') {
      perm = await alert.requestPermission();
    }
    if (perm === 'granted') {
      setAlertsEnabled(true);
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

  const handleRefresh = () => {
    refresh();
    spot.refresh();
  };

  return (
    <>
      <section className="card">
        <div className="section-header">
          <div>
            <h2>Gold (XAU/USD) · 15M</h2>
            <p className="muted">
              PAXG/USDT 15-minute candles from Binance, polled every {POLL_MS / 1000}s.
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
            <strong>3-green-candle alert</strong>
            <p className="muted small" style={{ margin: '4px 0 0' }}>
              {!alert.supported
                ? 'Browser notifications not supported here.'
                : alertsEnabled
                ? `Watching closed 15M candles. Current green streak: ${alert.streak}.`
                : alert.permission === 'denied'
                ? 'Notifications are blocked in browser settings.'
                : 'Enable to get a desktop ping when 3 green 15M candles close in a row.'}
            </p>
          </div>
          <div className="section-actions">
            {alertsEnabled && alert.permission === 'granted' && (
              <button
                type="button"
                className="button button--ghost"
                onClick={alert.sendTestNotification}
              >
                Test
              </button>
            )}
            <button
              type="button"
              className="button"
              onClick={handleToggleAlerts}
              disabled={!alert.supported || alert.permission === 'denied'}
            >
              {alertsEnabled ? 'Disable alerts' : 'Enable alerts'}
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
            {stats && (
              <div className="card metric">
                <span className="metric-label">Range</span>
                <span className="metric-value">USD {formatUsd(stats.low)}</span>
                <span className="metric-change muted small">
                  → {formatUsd(stats.high)}
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
            <p className="muted">Loading XAU/USD candles…</p>
          </div>
        ) : candles.length === 0 ? (
          <div className="empty-state">
            <p className="muted">No candle data available.</p>
          </div>
        ) : (
          <CandlestickChart candles={candles} />
        )}

        {lastUpdated && (
          <p className="muted small" style={{ marginTop: 12 }}>
            Updated {new Date(lastUpdated).toLocaleTimeString()} · {candles.length} × 15M candles
          </p>
        )}
      </section>

      <footer className="footer muted small">
        Source: Binance PAXG/USDT klines · Spot XAU from gold-api.com.
      </footer>
    </>
  );
};
