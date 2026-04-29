import { useMemo } from 'react';
import { PortfolioRow } from '../types';
import { formatNumber } from '../utils/format';

interface AssetChartProps {
  rows: PortfolioRow[];
  currencyLabel: string;
}

const PALETTE = ['#6366f1', '#22c55e', '#f97316', '#06b6d4', '#ec4899', '#eab308', '#8b5cf6', '#ef4444'];

export const AssetChart = ({ rows, currencyLabel }: AssetChartProps) => {
  const data = useMemo(() => {
    const items = rows
      .map((row) => ({
        asset: row.asset || 'Unnamed',
        value: row.quantity * row.currentPrice,
        invested: row.quantity * row.buyPrice,
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
    const max = items.reduce((acc, item) => Math.max(acc, item.value), 0);
    return { items, max };
  }, [rows]);

  if (data.items.length === 0) {
    return (
      <div className="empty-state">
        <p className="muted">No allocation to chart yet.</p>
      </div>
    );
  }

  return (
    <div className="chart">
      {data.items.map((item, idx) => {
        const widthPct = data.max > 0 ? (item.value / data.max) * 100 : 0;
        const pnl = item.value - item.invested;
        const positive = pnl >= 0;
        return (
          <div className="chart-row" key={`${item.asset}-${idx}`}>
            <div className="chart-label" title={item.asset}>
              {item.asset}
            </div>
            <div className="chart-bar-track">
              <div
                className="chart-bar-fill"
                style={{
                  width: `${widthPct}%`,
                  background: PALETTE[idx % PALETTE.length],
                }}
              />
            </div>
            <div className="chart-value">
              <span>
                {currencyLabel} {formatNumber(item.value, 0)}
              </span>
              <span className={positive ? 'positive' : 'negative'}>
                {positive ? '▲' : '▼'} {currencyLabel} {formatNumber(Math.abs(pnl), 0)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
