import { PortfolioTotals } from '../types';
import { formatNumber, formatPercent } from '../utils/format';

interface SummaryCardsProps {
  totals: PortfolioTotals;
  currencyLabel: string;
}

export const SummaryCards = ({ totals, currencyLabel }: SummaryCardsProps) => {
  const pnlClass = totals.pnl >= 0 ? 'metric--positive' : 'metric--negative';

  return (
    <div className="summary-grid">
      <div className="card metric">
        <span className="metric-label">Positions</span>
        <span className="metric-value">{totals.positions}</span>
      </div>
      <div className="card metric">
        <span className="metric-label">Total Invested</span>
        <span className="metric-value">
          {currencyLabel} {formatNumber(totals.invested)}
        </span>
      </div>
      <div className="card metric">
        <span className="metric-label">Current Value</span>
        <span className="metric-value">
          {currencyLabel} {formatNumber(totals.currentValue)}
        </span>
      </div>
      <div className={`card metric ${pnlClass}`}>
        <span className="metric-label">Profit / Loss</span>
        <span className="metric-value">
          {currencyLabel} {formatNumber(totals.pnl)}
        </span>
        <span className="metric-change">{formatPercent(totals.pnlPercent)}</span>
      </div>
    </div>
  );
};
