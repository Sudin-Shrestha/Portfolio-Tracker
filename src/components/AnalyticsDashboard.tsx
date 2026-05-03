import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { Transaction } from '../types';
import { formatNumber } from '../utils/format';

const PALETTE = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'];

export const AnalyticsDashboard = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'expenses'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Transaction[] = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          type: d.type || 'expense', // default legacy
          description: d.description,
          amount: d.amount,
          category: d.category,
          date: d.date,
        } as Transaction;
      });
      setTransactions(data);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const { monthlyData, categoryBreakdown, totals } = useMemo(() => {
    const monthly: Record<string, { income: number; expense: number }> = {};
    const categories: Record<string, number> = {};
    let totalInc = 0;
    let totalExp = 0;

    transactions.forEach((t) => {
      // Group by Month (YYYY-MM)
      const monthStr = t.date.substring(0, 7); 
      if (!monthly[monthStr]) {
        monthly[monthStr] = { income: 0, expense: 0 };
      }

      if (t.type === 'income') {
        monthly[monthStr].income += t.amount;
        totalInc += t.amount;
      } else {
        monthly[monthStr].expense += t.amount;
        totalExp += t.amount;
        // Add to Category Breakdown only for expenses
        if (!categories[t.category]) categories[t.category] = 0;
        categories[t.category] += t.amount;
      }
    });

    const monthlyArray = Object.keys(monthly)
      .sort() // chronological
      .map((key) => {
        const dateObj = new Date(key + '-01T00:00:00');
        const label = dateObj.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
        return {
          key,
          label,
          income: monthly[key].income,
          expense: monthly[key].expense,
        };
      });

    const categoryArray = Object.keys(categories)
      .map((cat) => ({ name: cat, value: categories[cat] }))
      .sort((a, b) => b.value - a.value);

    return {
      monthlyData: monthlyArray,
      categoryBreakdown: categoryArray,
      totals: { income: totalInc, expense: totalExp, net: totalInc - totalExp },
    };
  }, [transactions]);

  if (isLoading) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <p className="muted">Gathering your financial intelligence...</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>
        <h2 className="title">No Data Available</h2>
        <p className="muted">Start adding transactions in the Expense Tracker to see your analytics.</p>
      </div>
    );
  }

  // Calculate max scaling for monthly chart
  const maxMonthlyValue = Math.max(0, ...monthlyData.flatMap(m => [m.income, m.expense]));
  const maxCategoryValue = Math.max(0, ...categoryBreakdown.map(c => c.value));

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card summary-card">
          <h2 className="summary-title" style={{ fontSize: '1.2rem' }}>Total Income</h2>
          <div className="summary-value" style={{ color: 'var(--green)' }}>${formatNumber(totals.income, 2)}</div>
        </div>
        <div className="card summary-card">
          <h2 className="summary-title" style={{ fontSize: '1.2rem' }}>Total Expense</h2>
          <div className="summary-value" style={{ color: 'var(--red)' }}>${formatNumber(totals.expense, 2)}</div>
        </div>
        <div className="card summary-card">
          <h2 className="summary-title" style={{ fontSize: '1.2rem' }}>Net Savings</h2>
          <div className="summary-value" style={{ color: totals.net >= 0 ? 'var(--green)' : 'var(--red)' }}>
             {totals.net < 0 && '-'}${formatNumber(Math.abs(totals.net), 2)}
          </div>
        </div>
      </div>

      <section className="card" style={{ marginBottom: '2rem' }}>
        <div className="section-header">
          <h2>Income vs Expense by Month</h2>
        </div>
        <div className="chart" style={{ padding: '1rem 0' }}>
          {monthlyData.map((data, idx) => {
            const incomePct = maxMonthlyValue > 0 ? (data.income / maxMonthlyValue) * 100 : 0;
            const expensePct = maxMonthlyValue > 0 ? (data.expense / maxMonthlyValue) * 100 : 0;

            return (
              <div key={data.key} style={{ marginBottom: '1.5rem' }}>
                <div style={{ marginBottom: '0.4rem', fontWeight: 600 }}>{data.label}</div>
                
                {/* Income Bar */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <div style={{ width: '80px', fontSize: '0.8rem', color: 'var(--green)' }}>Income</div>
                  <div className="chart-bar-track" style={{ flex: 1, height: '18px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${incomePct}%`, 
                        background: 'var(--green)',
                        transition: 'width 0.5s ease'
                      }} 
                    />
                  </div>
                  <div style={{ width: '100px', textAlign: 'right', fontSize: '0.9rem' }}>${formatNumber(data.income, 0)}</div>
                </div>

                {/* Expense Bar */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: '80px', fontSize: '0.8rem', color: 'var(--red)' }}>Expense</div>
                  <div className="chart-bar-track" style={{ flex: 1, height: '18px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${expensePct}%`, 
                        background: 'var(--red)',
                        transition: 'width 0.5s ease'
                      }} 
                    />
                  </div>
                  <div style={{ width: '100px', textAlign: 'right', fontSize: '0.9rem' }}>${formatNumber(data.expense, 0)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Total Expense Breakdown</h2>
        </div>
        <div className="chart">
          {categoryBreakdown.map((cat, idx) => {
             const widthPct = maxCategoryValue > 0 ? (cat.value / maxCategoryValue) * 100 : 0;
             const color = PALETTE[idx % PALETTE.length];
             
             return (
               <div className="chart-row" key={cat.name}>
                 <div className="chart-label" title={cat.name}>{cat.name}</div>
                 <div className="chart-bar-track">
                   <div
                     className="chart-bar-fill"
                     style={{ width: `${widthPct}%`, background: color }}
                   />
                 </div>
                 <div className="chart-value">
                   <span>${formatNumber(cat.value, 0)}</span>
                 </div>
               </div>
             );
          })}
        </div>
      </section>
    </>
  );
};
