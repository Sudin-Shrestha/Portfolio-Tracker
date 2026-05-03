import { ChangeEvent } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { Theme, TrackerType } from '../types';

interface HeaderProps {
  tracker: TrackerType;
  theme: Theme;
  onTrackerChange: (tracker: TrackerType) => void;
  onToggleTheme: () => void;
  onImport: (file: File) => void;
  onExport: () => void;
  onLogout: () => void;
}

const pageTabs = [
  { value: 'portfolio', path: '/portfolio', label: 'Portfolio' },
  { value: 'expense', path: '/expense', label: 'Transactions' },
  { value: 'analytics', path: '/analytics', label: 'Analytics' },
  { value: 'gold', path: '/gold', label: 'Gold (XAU)' },
];

const trackerTabs: { value: TrackerType; label: string }[] = [
  { value: 'crypto', label: 'Crypto' },
  { value: 'nepal', label: 'NEPSE' },
];

export const Header = ({
  tracker,
  theme,
  onTrackerChange,
  onToggleTheme,
  onImport,
  onExport,
  onLogout,
}: HeaderProps) => {
  const location = useLocation();
  const page = location.pathname.replace('/', '') || 'home';
  
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
            : page === 'expense' 
            ? 'Log your Income and Expenses safely in the cloud.'
            : page === 'analytics'
            ? 'Visual breakdowns of your monthly financial flows.'
            : 'Live spot-gold candlesticks via Binance PAXG/USDT.'}
        </p>
      </div>

      <div className="header-actions">
        {page !== 'home' && (
          <Link
            to="/"
            className="button button--ghost"
            style={{ marginRight: '0.5rem', textDecoration: 'none' }}
          >
            🏠 Home
          </Link>
        )}

        {page !== 'home' && (
          <div className="tabs" role="tablist" aria-label="Page">
            {pageTabs.map((tab) => (
              <NavLink
                key={tab.value}
                to={tab.path}
                role="tab"
                aria-selected={page === tab.value}
                className={({ isActive }) => `tab ${isActive ? 'tab--active' : ''}`}
                style={{ textDecoration: 'none' }}
              >
                {tab.label}
              </NavLink>
            ))}
          </div>
        )}

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
