import { ChangeEvent } from 'react';
import { Page, Theme, TrackerType } from '../types';

interface HeaderProps {
  page: Page;
  tracker: TrackerType;
  theme: Theme;
  onPageChange: (page: Page) => void;
  onTrackerChange: (tracker: TrackerType) => void;
  onToggleTheme: () => void;
  onImport: (file: File) => void;
  onExport: () => void;
  onLogout: () => void;
}

const pageTabs: { value: Page; label: string }[] = [
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'gold', label: 'Gold (XAU/USD)' },
];

const trackerTabs: { value: TrackerType; label: string }[] = [
  { value: 'crypto', label: 'Crypto' },
  { value: 'nepal', label: 'NEPSE' },
];

export const Header = ({
  page,
  tracker,
  theme,
  onPageChange,
  onTrackerChange,
  onToggleTheme,
  onImport,
  onExport,
  onLogout,
}: HeaderProps) => {
  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onImport(file);
    event.target.value = '';
  };

  const isPortfolio = page === 'portfolio';

  return (
    <header className="card header">
      <div>
        <h1 className="title">Portfolio Tracker</h1>
        <p className="subtitle">
          {isPortfolio
            ? 'Crypto + NEPSE positions, calculated locally and synced to an Excel workbook.'
            : 'Live spot-gold candlesticks via Binance PAXG/USDT.'}
        </p>
      </div>

      <div className="header-actions">
        <div className="tabs" role="tablist" aria-label="Page">
          {pageTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={page === tab.value}
              className={`tab ${page === tab.value ? 'tab--active' : ''}`}
              onClick={() => onPageChange(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isPortfolio && (
          <div className="tabs" role="tablist" aria-label="Portfolio tracker">
            {trackerTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={tracker === tab.value}
                className={`tab ${tracker === tab.value ? 'tab--active' : ''}`}
                onClick={() => onTrackerChange(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {isPortfolio && (
          <>
            <label className="button button--ghost">
              Import .xlsx
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFile}
                style={{ display: 'none' }}
              />
            </label>

            <button type="button" className="button" onClick={onExport}>
              Export Excel
            </button>
          </>
        )}

        <button
          type="button"
          className="button button--ghost icon-button"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>

        <button
          type="button"
          className="button button--ghost"
          onClick={onLogout}
          title="Sign out"
        >
          Logout
        </button>
      </div>
    </header>
  );
};
