import { Link } from 'react-router-dom';

export const HomePage = () => {
  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '2rem' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 className="title" style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>Welcome Back</h1>
        <p className="subtitle" style={{ fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
          Manage your personal finances, track your investments, and stay on top of your daily expenses in one place.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', width: '100%', maxWidth: '1000px' }}>
        {/* Portfolio Card */}
        <Link 
          to="/portfolio"
          className="card" 
          style={{ textDecoration: 'none', display: 'block', cursor: 'pointer', textAlign: 'left', background: 'var(--surface-color)', border: '1px solid var(--border-color)', transition: 'transform 0.2s, box-shadow 0.2s', padding: '2rem' }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)'; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📈</div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-color)' }}>Portfolio Tracker</h2>
          <p className="muted">Track your Crypto and NEPSE investments. Keep an eye on live prices and calculate your profits easily.</p>
        </Link>

        {/* Expense Card */}
        <Link 
          to="/expense"
          className="card" 
          style={{ textDecoration: 'none', display: 'block', cursor: 'pointer', textAlign: 'left', background: 'var(--surface-color)', border: '1px solid var(--border-color)', transition: 'transform 0.2s, box-shadow 0.2s', padding: '2rem' }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)'; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💸</div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-color)' }}>Transactions</h2>
          <p className="muted">Monitor your daily income and expenses. Keep your spending categorized and organized.</p>
        </Link>

        {/* Analytics Card */}
        <Link 
          to="/analytics"
          className="card" 
          style={{ textDecoration: 'none', display: 'block', cursor: 'pointer', textAlign: 'left', background: 'var(--surface-color)', border: '1px solid var(--border-color)', transition: 'transform 0.2s, box-shadow 0.2s', padding: '2rem' }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)'; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📊</div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-color)' }}>Analytics</h2>
          <p className="muted">View your monthly income vs expense visualizations and gain insights on your net savings.</p>
        </Link>

        {/* Gold Card */}
        <Link 
          to="/gold"
          className="card" 
          style={{ textDecoration: 'none', display: 'block', cursor: 'pointer', textAlign: 'left', background: 'var(--surface-color)', border: '1px solid var(--border-color)', transition: 'transform 0.2s, box-shadow 0.2s', padding: '2rem' }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)'; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🪙</div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-color)' }}>Gold Spot (XAU)</h2>
          <p className="muted">Check the live candlestick charts for gold spot prices via Binance PAXG to track your physical holdings.</p>
        </Link>
      </div>
    </div>
  );
};
