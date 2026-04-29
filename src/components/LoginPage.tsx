import { FormEvent, useState } from 'react';
import { Theme } from '../types';

interface LoginPageProps {
  theme: Theme;
  onToggleTheme: () => void;
  onLogin: (email: string, password: string) => { ok: true } | { ok: false; error: string };
}

export const LoginPage = ({ theme, onToggleTheme, onLogin }: LoginPageProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    const result = onLogin(email, password);
    if (!result.ok) setError(result.error);
  };

  return (
    <div className="login-shell">
      <div className="login-theme-toggle">
        <button
          type="button"
          className="button button--ghost icon-button"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </div>

      <div className="card login-card">
        <div className="login-header">
          <h1 className="title">Portfolio Tracker</h1>
          <p className="subtitle">Admin sign-in required to view trackers.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <label className="login-field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@example.com"
              required
            />
          </label>

          <label className="login-field">
            <span>Password</span>
            <div className="login-password">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          {error && (
            <div className="banner banner--error" role="alert">
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="button login-submit">
            Sign in
          </button>

          <p className="muted small login-hint">
            Session token is stored locally and expires automatically after 24 hours.
          </p>
        </form>
      </div>
    </div>
  );
};
