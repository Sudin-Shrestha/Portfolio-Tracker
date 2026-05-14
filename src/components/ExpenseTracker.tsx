import { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Transaction, TransactionType } from '../types';
import { useAuth } from '../hooks/useAuth';

const EXPENSE_CATEGORIES = [
  'Grocery', 'Rent', 'Gym', 'Car Insurance', 'Health Insurance', 'Latitude',
  'Food', 'IT Exp', 'Astha', 'Nepal', 'Shopping', 'Eating Out', 'Fuel',
  'Sim Bill', 'Internet Bill', 'Electricity Bill', 'Entertainment',
  'Subscriptions', 'Medical/Pharmacy', 'Personal Care',
  'Crypto Investment', 'Stock Investment', 'Other Investment', 'Other',
];

const INCOME_CATEGORIES = ['Spas', 'Kentford', 'Other'];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

type TypeFilter = 'all' | TransactionType;

export const ExpenseTracker = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [type, setType] = useState<TransactionType>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Filter & pagination state
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'expenses'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            type: d.type || 'expense',
            description: d.description,
            amount: d.amount,
            category: d.category,
            date: d.date,
            notes: d.notes || '',
            createdAt: d.createdAt?.toMillis ? d.createdAt.toMillis() : Date.now(),
          } as Transaction & { createdAt: number };
        });

        data.sort((a: any, b: any) => b.createdAt - a.createdAt);
        setTransactions(data);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching transactions:', error);
        setIsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, categoryFilter, fromDate, toDate, pageSize]);

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    setCategory(newType === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0]);
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !category || !date || !user) return;

    try {
      await addDoc(collection(db, 'expenses'), {
        userId: user.uid,
        type,
        description,
        amount: parseFloat(amount),
        category,
        date,
        notes,
        createdAt: new Date(),
      });
      setDescription('');
      setAmount('');
      setNotes('');
    } catch (e: any) {
      console.error('Error adding document: ', e);
      alert('Firebase Error (Add Transaction): ' + e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transaction?')) return;
    try {
      await deleteDoc(doc(db, 'expenses', id));
    } catch (e: any) {
      console.error('Error deleting document: ', e);
      alert('Firebase Error (Delete Transaction): ' + e.message);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setCategoryFilter('all');
    setFromDate('');
    setToDate('');
  };

  const allCategories = useMemo(() => {
    const set = new Set<string>([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]);
    transactions.forEach((t) => set.add(t.category));
    return Array.from(set).sort();
  }, [transactions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (fromDate && t.date < fromDate) return false;
      if (toDate && t.date > toDate) return false;
      if (q) {
        const haystack = `${t.description} ${t.notes || ''} ${t.category}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, search, typeFilter, categoryFilter, fromDate, toDate]);

  const filteredTotals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of filtered) {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    }
    return { income, expense, net: income - expense };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  const hasActiveFilters =
    search !== '' ||
    typeFilter !== 'all' ||
    categoryFilter !== 'all' ||
    fromDate !== '' ||
    toDate !== '';

  const formatAmount = (n: number) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <>
      {/* Summary + add toggle */}
      <div className="tx-summary-bar">
        <div className="tx-summary-card tx-summary-card--income">
          <span className="tx-summary-label">Income</span>
          <span className="tx-summary-value">${formatAmount(filteredTotals.income)}</span>
        </div>
        <div className="tx-summary-card tx-summary-card--expense">
          <span className="tx-summary-label">Expense</span>
          <span className="tx-summary-value">${formatAmount(filteredTotals.expense)}</span>
        </div>
        <div
          className={`tx-summary-card ${
            filteredTotals.net >= 0 ? 'tx-summary-card--income' : 'tx-summary-card--expense'
          }`}
        >
          <span className="tx-summary-label">Balance</span>
          <span className="tx-summary-value">
            {filteredTotals.net < 0 ? '-' : ''}${formatAmount(Math.abs(filteredTotals.net))}
          </span>
        </div>
        <button
          type="button"
          className="button tx-add-button"
          onClick={() => setFormOpen((o) => !o)}
        >
          {formOpen ? '× Close' : '+ New Transaction'}
        </button>
      </div>

      {/* Add form */}
      {formOpen && (
        <section className="card tx-form-card">
          <div className="section-header">
            <div>
              <h2>Log a transaction</h2>
              <p className="muted small">Track your income and spending in the cloud.</p>
            </div>
          </div>

          <div className="tx-type-toggle">
            <button
              type="button"
              className={`tx-type-pill ${type === 'expense' ? 'tx-type-pill--active tx-type-pill--expense' : ''}`}
              onClick={() => handleTypeChange('expense')}
            >
              ↓ Expense
            </button>
            <button
              type="button"
              className={`tx-type-pill ${type === 'income' ? 'tx-type-pill--active tx-type-pill--income' : ''}`}
              onClick={() => handleTypeChange('income')}
            >
              ↑ Income
            </button>
          </div>

          <form onSubmit={handleAddTransaction} className="tx-form-grid">
            <label className="tx-field">
              <span>Description</span>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Lunch with team"
                required
              />
            </label>

            <label className="tx-field">
              <span>Amount</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </label>

            <label className="tx-field">
              <span>Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                {(type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>

            <label className="tx-field">
              <span>Date</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </label>

            <label className="tx-field tx-field--full">
              <span>Notes (optional)</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any extra details…"
                rows={2}
              />
            </label>

            <div className="tx-form-actions">
              <button
                type="submit"
                className="button"
                style={{
                  background: type === 'expense' ? 'var(--negative)' : 'var(--positive)',
                }}
              >
                Add {type === 'expense' ? 'Expense' : 'Income'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Filters */}
      <section className="card tx-filter-card">
        <div className="tx-filter-grid">
          <div className="tx-filter tx-filter--search">
            <label className="tx-filter-label">Search</label>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Description, notes, category…"
            />
          </div>

          <div className="tx-filter">
            <label className="tx-filter-label">Type</label>
            <div className="tx-segmented">
              {(['all', 'income', 'expense'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`tx-segmented-btn ${typeFilter === opt ? 'is-active' : ''}`}
                  onClick={() => setTypeFilter(opt)}
                >
                  {opt === 'all' ? 'All' : opt === 'income' ? 'Income' : 'Expense'}
                </button>
              ))}
            </div>
          </div>

          <div className="tx-filter">
            <label className="tx-filter-label">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All categories</option>
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="tx-filter">
            <label className="tx-filter-label">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div className="tx-filter">
            <label className="tx-filter-label">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          <div className="tx-filter tx-filter--reset">
            <button
              type="button"
              className="button button--ghost"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
            >
              Reset
            </button>
          </div>
        </div>
      </section>

      {/* Transaction list */}
      <section className="card">
        <div className="section-header">
          <div>
            <h2>Transactions</h2>
            <p className="muted small">
              {isLoading
                ? 'Fetching from cloud…'
                : filtered.length === 0
                ? 'No matches for the current filters'
                : `Showing ${start + 1}–${Math.min(start + pageSize, filtered.length)} of ${filtered.length}`}
            </p>
          </div>
          <div className="section-actions">
            <label className="tx-page-size">
              <span className="muted small">Per page</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {isLoading ? (
          <div className="empty-state">
            <p>Loading transactions…</p>
          </div>
        ) : pageItems.length === 0 ? (
          <div className="empty-state">
            <p>No transactions to show.</p>
            {hasActiveFilters && <p className="small">Try clearing filters or widening the date range.</p>}
          </div>
        ) : (
          <ul className="tx-list">
            {pageItems.map((t) => {
              const isExpense = t.type === 'expense';
              return (
                <li key={t.id} className={`tx-row tx-row--${t.type}`}>
                  <div className={`tx-icon tx-icon--${t.type}`}>{isExpense ? '↓' : '↑'}</div>
                  <div className="tx-main">
                    <div className="tx-desc">{t.description}</div>
                    <div className="tx-sub">
                      <span className="tx-pill">{t.category}</span>
                      <span className="tx-dot">·</span>
                      <span>{new Date(t.date).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}</span>
                      {t.notes && (
                        <>
                          <span className="tx-dot">·</span>
                          <span className="tx-notes" title={t.notes}>{t.notes}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className={`tx-amount tx-amount--${t.type}`}>
                    {isExpense ? '-' : '+'}${formatAmount(t.amount)}
                  </div>
                  <button
                    type="button"
                    className="icon-button danger"
                    onClick={() => handleDelete(t.id)}
                    title="Delete transaction"
                    aria-label="Delete transaction"
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {filtered.length > 0 && (
          <div className="tx-pagination">
            <button
              type="button"
              className="button button--ghost"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              ‹ Prev
            </button>
            <span className="muted small">
              Page <strong>{currentPage}</strong> of {totalPages}
            </span>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next ›
            </button>
          </div>
        )}
      </section>
    </>
  );
};
