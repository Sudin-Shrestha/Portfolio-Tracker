import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { Transaction } from '../types';
import { formatNumber } from '../utils/format';
import { TransactionExportMenu } from './TransactionExportMenu';

const PALETTE = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#14b8a6', '#3b82f6', '#8b5cf6', '#ef4444'];

const monthLongLabel = (key: string) => {
  const d = new Date(key + '-01T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

const monthShortLabel = (key: string) => {
  const d = new Date(key + '-01T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
};

export const AnalyticsDashboard = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'expenses'),
      where('userId', '==', user.uid),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: Transaction[] = snapshot.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            type: d.type || 'expense',
            description: d.description,
            amount: d.amount,
            category: d.category,
            date: d.date,
          } as Transaction;
        });
        setTransactions(data);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching analytics transactions:', error);
        setIsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  // Always-on monthly history (for trend chart + month picker)
  const monthlyHistory = useMemo(() => {
    const monthly: Record<string, { income: number; expense: number }> = {};
    transactions.forEach((t) => {
      const monthStr = t.date.substring(0, 7);
      if (!monthly[monthStr]) monthly[monthStr] = { income: 0, expense: 0 };
      if (t.type === 'income') monthly[monthStr].income += t.amount;
      else monthly[monthStr].expense += t.amount;
    });

    return Object.keys(monthly)
      .sort()
      .map((key) => ({
        key,
        label: monthShortLabel(key),
        income: monthly[key].income,
        expense: monthly[key].expense,
        savings: monthly[key].income - monthly[key].expense,
      }));
  }, [transactions]);

  // If the selected month no longer exists in the data, fall back to "all"
  useEffect(() => {
    if (selectedMonth === 'all') return;
    if (!monthlyHistory.find((m) => m.key === selectedMonth)) {
      setSelectedMonth('all');
    }
  }, [monthlyHistory, selectedMonth]);

  const filteredTransactions = useMemo(() => {
    if (selectedMonth === 'all') return transactions;
    return transactions.filter((t) => t.date.substring(0, 7) === selectedMonth);
  }, [transactions, selectedMonth]);

  // Stats from filtered transactions (totals, donut, counts)
  const filteredStats = useMemo(() => {
    const categories: Record<string, number> = {};
    let totalInc = 0;
    let totalExp = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    filteredTransactions.forEach((t) => {
      if (t.type === 'income') {
        totalInc += t.amount;
        incomeCount += 1;
      } else {
        totalExp += t.amount;
        expenseCount += 1;
        categories[t.category] = (categories[t.category] || 0) + t.amount;
      }
    });

    const categoryArray = Object.keys(categories)
      .map((cat) => ({ name: cat, value: categories[cat] }))
      .sort((a, b) => b.value - a.value);

    const savingsRate = totalInc > 0 ? ((totalInc - totalExp) / totalInc) * 100 : 0;

    return {
      totals: { income: totalInc, expense: totalExp, net: totalInc - totalExp },
      counts: { income: incomeCount, expense: expenseCount, total: filteredTransactions.length },
      categoryBreakdown: categoryArray,
      savingsRate,
    };
  }, [filteredTransactions]);

  // All-time stats (for "best savings month" insight)
  const bestSavingsMonth = useMemo(
    () =>
      monthlyHistory.reduce<typeof monthlyHistory[number] | null>(
        (best, m) => (best === null || m.savings > best.savings ? m : best),
        null,
      ),
    [monthlyHistory],
  );

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <p className="muted">Gathering your financial intelligence…</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <section className="card empty-state" style={{ marginTop: '2rem' }}>
        <h2 className="title" style={{ marginBottom: 8 }}>No data yet</h2>
        <p>Start adding transactions in the Expense Tracker to see your analytics light up.</p>
      </section>
    );
  }

  const { totals, counts, categoryBreakdown, savingsRate } = filteredStats;
  const isAllTime = selectedMonth === 'all';
  const periodLabel = isAllTime ? 'All time' : monthLongLabel(selectedMonth);

  const maxMonthlyValue = Math.max(1, ...monthlyHistory.flatMap((m) => [m.income, m.expense]));
  const totalCatValue = categoryBreakdown.reduce((s, c) => s + c.value, 0);

  let cumulative = 0;
  const donutStops = categoryBreakdown.map((cat, i) => {
    const start = cumulative;
    const slicePct = totalCatValue > 0 ? (cat.value / totalCatValue) * 100 : 0;
    const end = start + slicePct;
    cumulative = end;
    return `${PALETTE[i % PALETTE.length]} ${start}% ${end}%`;
  });
  const donutBackground =
    donutStops.length > 0 ? `conic-gradient(${donutStops.join(', ')})` : 'var(--surface-muted)';

  const topCategory = categoryBreakdown[0];
  const monthsTracked = monthlyHistory.length || 1;
  const avgSpendValue = isAllTime ? totals.expense / monthsTracked : totals.expense;
  const avgSpendLabel = isAllTime ? 'Avg monthly spend' : 'Spent this month';
  const avgSpendMeta = isAllTime
    ? `across ${monthsTracked} month${monthsTracked === 1 ? '' : 's'}`
    : monthLongLabel(selectedMonth);

  return (
    <>
      <div className="analytics-hero">
        <div>
          <h1 className="title" style={{ marginBottom: 4 }}>Financial Analytics</h1>
          <p className="muted">
            {isAllTime
              ? `A snapshot across ${counts.total} transaction${counts.total === 1 ? '' : 's'}.`
              : `${periodLabel} · ${counts.total} transaction${counts.total === 1 ? '' : 's'} this month.`}
          </p>
        </div>
        <div className="analytics-hero-actions">
          <div className="analytics-month-filter">
            <label className="tx-filter-label" htmlFor="month-filter">Period</label>
            <select
              id="month-filter"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="all">All time</option>
              {[...monthlyHistory].reverse().map((m) => (
                <option key={m.key} value={m.key}>
                  {monthLongLabel(m.key)}
                </option>
              ))}
            </select>
          </div>
          <TransactionExportMenu
            transactions={transactions}
            initialMonth={selectedMonth}
            label="Export for AI"
          />
        </div>
      </div>

      {!isAllTime && counts.total === 0 && (
        <section className="card empty-state">
          <p>No transactions recorded for {periodLabel}.</p>
          <p className="small">Pick a different month or switch back to All time.</p>
        </section>
      )}

      <div className="stats-grid">
        <div className="stat-card stat-card--income">
          <span className="stat-badge">Income</span>
          <div className="stat-value">${formatNumber(totals.income, 2)}</div>
          <div className="stat-meta">{counts.income} entries · {periodLabel}</div>
        </div>

        <div className="stat-card stat-card--expense">
          <span className="stat-badge">Expense</span>
          <div className="stat-value">${formatNumber(totals.expense, 2)}</div>
          <div className="stat-meta">{counts.expense} entries · {periodLabel}</div>
        </div>

        <div className={`stat-card ${totals.net >= 0 ? 'stat-card--income' : 'stat-card--expense'}`}>
          <span className="stat-badge">Net Savings</span>
          <div className="stat-value">
            {totals.net < 0 ? '-' : ''}${formatNumber(Math.abs(totals.net), 2)}
          </div>
          <div className="stat-meta">{totals.net >= 0 ? 'in the green' : 'overspending'}</div>
        </div>

        <div className="stat-card stat-card--rate">
          <span className="stat-badge">Savings Rate</span>
          <div className="stat-value">{savingsRate.toFixed(1)}%</div>
          <div className="stat-progress">
            <div
              className="stat-progress-fill"
              style={{ width: `${Math.max(0, Math.min(100, savingsRate))}%` }}
            />
          </div>
        </div>
      </div>

      <div className="analytics-grid">
        <section className="card analytics-card">
          <div className="section-header">
            <div>
              <h2>Where your money goes</h2>
              <p className="muted small">Expense breakdown · {periodLabel}.</p>
            </div>
          </div>

          {categoryBreakdown.length === 0 ? (
            <div className="empty-state">
              <p>No expenses recorded for this period.</p>
            </div>
          ) : (
            <div className="donut-wrap">
              <div className="donut" style={{ background: donutBackground }}>
                <div className="donut-hole">
                  <span className="donut-label">Total spent</span>
                  <span className="donut-total">${formatNumber(totalCatValue, 0)}</span>
                </div>
              </div>
              <ul className="donut-legend">
                {categoryBreakdown.map((cat, idx) => {
                  const pct = totalCatValue > 0 ? (cat.value / totalCatValue) * 100 : 0;
                  return (
                    <li key={cat.name}>
                      <span
                        className="legend-dot"
                        style={{ background: PALETTE[idx % PALETTE.length] }}
                      />
                      <span className="legend-name" title={cat.name}>{cat.name}</span>
                      <span className="legend-value">
                        ${formatNumber(cat.value, 0)}
                        <small> · {pct.toFixed(0)}%</small>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>

        <section className="card analytics-card">
          <div className="section-header">
            <div>
              <h2>Monthly trend</h2>
              <p className="muted small">Click a month to drill in.</p>
            </div>
            <div className="legend-row">
              <span><span className="legend-dot" style={{ background: 'var(--positive)' }} /> Income</span>
              <span><span className="legend-dot" style={{ background: 'var(--negative)' }} /> Expense</span>
            </div>
          </div>

          <div className={`bar-chart ${!isAllTime ? 'bar-chart--has-active' : ''}`}>
            {monthlyHistory.map((data) => {
              const incomePct = (data.income / maxMonthlyValue) * 100;
              const expensePct = (data.expense / maxMonthlyValue) * 100;
              const isActive = selectedMonth === data.key;
              return (
                <button
                  type="button"
                  className={`bar-group ${isActive ? 'bar-group--active' : ''}`}
                  key={data.key}
                  onClick={() =>
                    setSelectedMonth((prev) => (prev === data.key ? 'all' : data.key))
                  }
                  title={`${monthLongLabel(data.key)} · Income $${formatNumber(data.income, 0)} · Expense $${formatNumber(data.expense, 0)}`}
                >
                  <div className="bars">
                    <div className="bar bar--income" style={{ height: `${incomePct}%` }} />
                    <div className="bar bar--expense" style={{ height: `${expensePct}%` }} />
                  </div>
                  <div className="bar-label">{data.label}</div>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <section className="card">
        <div className="section-header">
          <div>
            <h2>Insights</h2>
            <p className="muted small">Quick takeaways for {periodLabel.toLowerCase()}.</p>
          </div>
        </div>
        <div className="insights-grid">
          <div className="insight">
            <div className="insight-label">Top spending category</div>
            <div className="insight-value">{topCategory ? topCategory.name : '—'}</div>
            <div className="insight-meta">
              {topCategory ? `$${formatNumber(topCategory.value, 0)}` : 'No expenses'}
            </div>
          </div>
          <div className="insight">
            <div className="insight-label">{avgSpendLabel}</div>
            <div className="insight-value">${formatNumber(avgSpendValue, 0)}</div>
            <div className="insight-meta">{avgSpendMeta}</div>
          </div>
          <div className="insight">
            <div className="insight-label">Best savings month</div>
            <div className="insight-value">
              {bestSavingsMonth ? monthShortLabel(bestSavingsMonth.key) : '—'}
            </div>
            <div className="insight-meta">
              {bestSavingsMonth
                ? `${bestSavingsMonth.savings >= 0 ? '+' : '-'}$${formatNumber(Math.abs(bestSavingsMonth.savings), 0)} saved`
                : 'No data'}
            </div>
          </div>
          <div className="insight">
            <div className="insight-label">Transactions</div>
            <div className="insight-value">{counts.total}</div>
            <div className="insight-meta">{isAllTime ? 'logged in total' : `in ${periodLabel}`}</div>
          </div>
        </div>
      </section>
    </>
  );
};
