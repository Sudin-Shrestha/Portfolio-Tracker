import { PortfolioRow, PortfolioTotals, RowMetrics } from '../types';

export const formatNumber = (value: number, fractionDigits = 2): string =>
  Number.isFinite(value)
    ? value.toLocaleString(undefined, {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      })
    : '0.00';

export const formatPercent = (value: number): string => {
  if (!Number.isFinite(value)) return '0.00%';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

export const computeRowMetrics = (row: PortfolioRow): RowMetrics => {
  const invested = row.quantity * row.buyPrice;
  const totalValue = row.quantity * row.currentPrice;
  const pnl = totalValue - invested;
  const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;
  return { invested, totalValue, pnl, pnlPercent };
};

export const computeTotals = (rows: PortfolioRow[]): PortfolioTotals => {
  let invested = 0;
  let currentValue = 0;
  for (const row of rows) {
    invested += row.quantity * row.buyPrice;
    currentValue += row.quantity * row.currentPrice;
  }
  const pnl = currentValue - invested;
  const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;
  return {
    invested,
    currentValue,
    pnl,
    pnlPercent,
    positions: rows.length,
  };
};
