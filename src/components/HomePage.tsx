import { Link } from 'react-router-dom';
import { TaskStats } from './dashboard/TaskStats';

export const HomePage = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <h1 className="title" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', marginBottom: '0.5rem' }}>Welcome Back</h1>
        <p className="subtitle" style={{ fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
          Manage your personal finances, track your investments, and stay on top of your daily expenses in one place.
        </p>
      </div>

      <TaskStats />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', width: '100%' }}>
        <Link 
          to="/tasks"
          className="card" 
          style={{ textDecoration: 'none', display: 'block', cursor: 'pointer', textAlign: 'left', background: 'var(--surface-color)', border: '1px solid var(--border-color)', transition: 'transform 0.2s, box-shadow 0.2s', padding: '2rem' }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)'; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✅</div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-color)' }}>Task Boards</h2>
          <p className="muted">Kanban-style task management. Organize your work with boards, columns, and drag-and-drop.</p>
        </Link>

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
