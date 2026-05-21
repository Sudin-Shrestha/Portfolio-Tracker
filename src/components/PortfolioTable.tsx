import { ChangeEvent } from 'react';
import { PortfolioRow, TrackerType } from '../types';
import { computeRowMetrics, formatNumber, formatPercent } from '../utils/format';

interface PortfolioTableProps {
  tracker: TrackerType;
  rows: PortfolioRow[];
  currencyLabel: string;
  onChange: (id: string, patch: Partial<Omit<PortfolioRow, 'id'>>) => void;
  onDelete: (id: string) => void;
}

export const PortfolioTable = ({
  tracker,
  rows,
  currencyLabel,
  onChange,
  onDelete,
}: PortfolioTableProps) => {
  const handleNumber =
    (id: string, field: 'quantity' | 'buyPrice' | 'currentPrice') =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const next = Number(event.target.value);
      onChange(id, { [field]: Number.isFinite(next) ? next : 0 });
    };

  if (rows.length === 0) {
    return (
      <div className="empty-state">
        <p>No {tracker === 'crypto' ? 'coins' : 'stocks'} yet.</p>
        <p className="muted">Click "Add row" to start tracking, or import an Excel file.</p>
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Asset</th>
            <th>Quantity</th>
            <th>Buy Price</th>
            <th>Current Price</th>
            {tracker === 'crypto' && <th>CoinGecko ID</th>}
            {tracker === 'nepal' && <th className="num">Fees</th>}
            <th className="num">Total Value</th>
            <th className="num">P/L</th>
            <th className="num">P/L %</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const metrics = computeRowMetrics(row, tracker);
            const positive = metrics.pnl >= 0;
            const feesTitle =
              tracker === 'nepal'
                ? 'Broker commission + SEBON fee + DP charge (Rs 25)'
                : undefined;
            return (
              <tr key={row.id}>
                <td>
                  <input
                    type="text"
                    value={row.asset}
                    placeholder={tracker === 'crypto' ? 'BTC' : 'NABIL'}
                    onChange={(event) => onChange(row.id, { asset: event.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={row.quantity}
                    onChange={handleNumber(row.id, 'quantity')}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={row.buyPrice}
                    onChange={handleNumber(row.id, 'buyPrice')}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={row.currentPrice}
                    onChange={handleNumber(row.id, 'currentPrice')}
                  />
                </td>
                {tracker === 'crypto' && (
                  <td>
                    <input
                      type="text"
                      placeholder="bitcoin"
                      value={row.coingeckoId ?? ''}
                      onChange={(event) =>
                        onChange(row.id, { coingeckoId: event.target.value })
                      }
                    />
                  </td>
                )}
                {tracker === 'nepal' && (
                  <td className="num" title={feesTitle}>
                    {currencyLabel} {formatNumber(metrics.fees)}
                  </td>
                )}
                <td className="num">
                  {currencyLabel} {formatNumber(metrics.totalValue)}
                </td>
                <td className={`num ${positive ? 'positive' : 'negative'}`}>
                  {currencyLabel} {formatNumber(metrics.pnl)}
                </td>
                <td className={`num ${positive ? 'positive' : 'negative'}`}>
                  {formatPercent(metrics.pnlPercent)}
                </td>
                <td>
                  <button
                    type="button"
                    className="icon-button danger"
                    aria-label={`Delete ${row.asset || 'row'}`}
                    onClick={() => onDelete(row.id)}
                  >
                    ×
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
