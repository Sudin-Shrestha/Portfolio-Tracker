import { PortfolioRow, PortfolioTotals, RowMetrics, TrackerType } from '../types';
import { calculateNepseBuyFees } from './nepseFees';

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

export const computeRowMetrics = (row: PortfolioRow, tracker?: TrackerType): RowMetrics => {
  const baseInvested = row.quantity * row.buyPrice;
  const fees = tracker === 'nepal' ? calculateNepseBuyFees(baseInvested).total : 0;
  const invested = baseInvested + fees;
  const totalValue = row.quantity * row.currentPrice;
  const pnl = totalValue - invested;
  const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;
  return { invested, totalValue, pnl, pnlPercent, fees };
};

export const computeTotals = (rows: PortfolioRow[], tracker?: TrackerType): PortfolioTotals => {
  let invested = 0;
  let currentValue = 0;
  let fees = 0;
  for (const row of rows) {
    const base = row.quantity * row.buyPrice;
    const rowFees = tracker === 'nepal' ? calculateNepseBuyFees(base).total : 0;
    invested += base + rowFees;
    currentValue += row.quantity * row.currentPrice;
    fees += rowFees;
  }
  const pnl = currentValue - invested;
  const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;
  return {
    invested,
    currentValue,
    pnl,
    pnlPercent,
    positions: rows.length,
    fees,
  };
};
