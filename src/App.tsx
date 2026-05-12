import { useCallback, useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { SummaryCards } from './components/SummaryCards';
import { PortfolioTable } from './components/PortfolioTable';
import { AssetChart } from './components/AssetChart';
import { HomePage } from './components/HomePage';
import { ExpenseTracker } from './components/ExpenseTracker';
import { GoldPage } from './components/GoldPage';
import { LoginPage } from './components/LoginPage';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { TasksPage } from './components/tasks/TasksPage';
import { TaskStats } from './components/dashboard/TaskStats';
import { usePortfolio } from './hooks/usePortfolio';
import { useTheme } from './hooks/useTheme';
import { useCryptoPrices } from './hooks/useCryptoPrices';
import { useNepsePrices } from './hooks/useNepsePrices';
import { useAuth } from './hooks/useAuth';
import { readWorkbookFromFile } from './utils/excel';
import { computeTotals } from './utils/format';
import { PortfolioRow, Theme, TrackerType } from './types';

type Status = { kind: 'idle' } | { kind: 'info' | 'error' | 'success'; message: string };

const CURRENCY: Record<TrackerType, string> = {
  crypto: 'AUD',
  nepal: 'NPR',
};

interface AuthenticatedAppProps {
  theme: Theme;
  onToggleTheme: () => void;
  onLogout: () => void;
}

const AuthenticatedApp = ({ theme, onToggleTheme, onLogout }: AuthenticatedAppProps) => {
  const [tracker, setTracker] = useState<TrackerType>('crypto');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const portfolio = usePortfolio();

  const rows = portfolio.state[tracker];
  const totals = useMemo(() => computeTotals(rows), [rows]);

  const applyLivePrices = useCallback(
    (priceById: Record<string, number>) => {
      const updated: PortfolioRow[] = portfolio.state.crypto.map((row) =>
        priceById[row.id] !== undefined ? { ...row, currentPrice: priceById[row.id] } : row,
      );
      portfolio.replaceTracker('crypto', updated);
    },
    [portfolio],
  );

  const applyNepsePrices = useCallback(
    (priceById: Record<string, number>) => {
      const updated: PortfolioRow[] = portfolio.state.nepal.map((row) =>
        priceById[row.id] !== undefined ? { ...row, currentPrice: priceById[row.id] } : row,
      );
      portfolio.replaceTracker('nepal', updated);
    },
    [portfolio],
  );

  const cryptoPrices = useCryptoPrices(portfolio.state.crypto, applyLivePrices);
  const nepsePrices = useNepsePrices(portfolio.state.nepal, applyNepsePrices);

  const handleImport = async (file: File) => {
    try {
      const imported = await readWorkbookFromFile(file);
      portfolio.mergeImported(imported);
      const sheets = [
        imported.crypto ? `${imported.crypto.length} crypto` : null,
        imported.nepal ? `${imported.nepal.length} NEPSE` : null,
      ]
        .filter(Boolean)
        .join(', ');
      
      const successMsg = sheets ? `Imported ${sheets} rows.` : 'No matching sheets found in file.';
      alert("Import Success: " + successMsg);
      setStatus({
        kind: 'success',
        message: successMsg,
      });
    } catch (err: any) {
      alert("Import Failed: " + err.message);
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Failed to read file',
      });
    }
  };

  const handleExport = () => {
    portfolio.exportToExcel();
    setStatus({ kind: 'success', message: 'Workbook downloaded as portfolio.xlsx.' });
  };

  const handleRefreshPrices = async () => {
    setStatus({ kind: 'info', message: 'Fetching live prices from CoinGecko…' });
    const result = await cryptoPrices.refresh();
    if (cryptoPrices.error) {
      setStatus({ kind: 'error', message: cryptoPrices.error });
    } else {
      setStatus({
        kind: 'success',
        message: `Updated ${result.updated} coin${result.updated === 1 ? '' : 's'}${
          result.skipped ? ` (skipped ${result.skipped})` : ''
        }.`,
      });
    }
  };

  const handleRefreshNepse = async () => {
    setStatus({ kind: 'info', message: 'Fetching NEPSE prices from merolagani…' });
    const result = await nepsePrices.refresh();
    if (nepsePrices.error) {
      setStatus({ kind: 'error', message: nepsePrices.error });
      return;
    }
    const parts = [
      `Validated ${result.matched} stock${result.matched === 1 ? '' : 's'}`,
      result.missing.length
        ? `not in today's turnover list: ${result.missing.join(', ')}`
        : null,
      result.asOf ? `as of ${result.asOf}` : null,
    ].filter(Boolean);
    setStatus({ kind: 'success', message: parts.join(' · ') });
  };

  const lastUpdatedLabel = cryptoPrices.lastUpdated
    ? new Date(cryptoPrices.lastUpdated).toLocaleTimeString()
    : null;
  const nepseLastUpdatedLabel = nepsePrices.lastUpdated
    ? new Date(nepsePrices.lastUpdated).toLocaleTimeString()
    : null;

  return (
    <div className="container">
      <Header
        tracker={tracker}
        theme={theme}
        onTrackerChange={setTracker}
        onToggleTheme={onToggleTheme}
        onImport={handleImport}
        onExport={handleExport}
        onLogout={onLogout}
      />

      <Routes>
        <Route path="/" element={<HomePage />} />
        
        <Route path="/portfolio" element={
          <>
            {status.kind !== 'idle' && (
              <div className={`banner banner--${status.kind}`} role="status">
                <span>{status.message}</span>
                <button
                  type="button"
                  className="banner-close"
                  aria-label="Dismiss"
                  onClick={() => setStatus({ kind: 'idle' })}
                >
                  ×
                </button>
              </div>
            )}
            <SummaryCards totals={totals} currencyLabel={CURRENCY[tracker]} />

            <section className="card">
              <div className="section-header">
                <div>
                  <h2>{tracker === 'crypto' ? 'Crypto Portfolio' : 'Nepal Share Market (NEPSE)'}</h2>
                  <p className="muted">
                    {tracker === 'crypto'
                      ? 'Add your coins, then refresh prices from CoinGecko.'
                      : 'Validate via merolagani.com (top-turnover stocks only) or edit prices manually.'}
                  </p>
                </div>
                <div className="section-actions">
                  <button type="button" className="button" onClick={() => portfolio.addRow(tracker)}>
                    + Add row
                  </button>
                  {tracker === 'crypto' && (
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={handleRefreshPrices}
                      disabled={cryptoPrices.loading}
                    >
                      {cryptoPrices.loading ? 'Refreshing…' : 'Refresh live prices'}
                    </button>
                  )}
                  {tracker === 'nepal' && (
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={handleRefreshNepse}
                      disabled={nepsePrices.loading}
                    >
                      {nepsePrices.loading ? 'Validating…' : 'Validate via merolagani'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={portfolio.resetSample}
                  >
                    Reset sample
                  </button>
                </div>
              </div>

              {tracker === 'crypto' && lastUpdatedLabel && (
                <p className="muted small">Last live refresh at {lastUpdatedLabel}</p>
              )}
              {tracker === 'nepal' && nepseLastUpdatedLabel && (
                <p className="muted small">Last NEPSE validation at {nepseLastUpdatedLabel}</p>
              )}

              <PortfolioTable
                tracker={tracker}
                rows={rows}
                currencyLabel={CURRENCY[tracker]}
                onChange={(id, patch) => portfolio.updateRow(tracker, id, patch)}
                onDelete={(id) => portfolio.deleteRow(tracker, id)}
              />
            </section>

            <section className="card">
              <div className="section-header">
                <h2>Allocation</h2>
                <p className="muted">Top holdings by current value.</p>
              </div>
              <AssetChart rows={rows} currencyLabel={CURRENCY[tracker]} />
            </section>

            <footer className="footer muted small">
              Data is stored securely in Firebase and exported on demand to <code>portfolio.xlsx</code>.
              Sheets: <code>Crypto</code>, <code>NEPSE</code>. Columns: Asset Name, Quantity, Buy
              Price, Current Price, Total Value, Profit/Loss, CoinGecko ID.
            </footer>
          </>
        } />
        
        <Route path="/tasks/*" element={<TasksPage />} />
        <Route path="/expense" element={<ExpenseTracker />} />
        <Route path="/analytics" element={<AnalyticsDashboard />} />
        <Route path="/gold" element={<GoldPage />} />
        
        {/* Redirect unknown routes back to home */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
};

const App = () => {
  const { theme, toggleTheme } = useTheme();
  const auth = useAuth();

  if (auth.loading) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p className="muted">Loading user session...</p>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return <LoginPage theme={theme} onToggleTheme={toggleTheme} onLogin={auth.login} />;
  }

  return (
    <BrowserRouter>
      <AuthenticatedApp theme={theme} onToggleTheme={toggleTheme} onLogout={auth.logout} />
    </BrowserRouter>
  );
};

export default App;
