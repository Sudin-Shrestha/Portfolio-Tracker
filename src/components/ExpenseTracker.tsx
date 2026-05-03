import { useState, useEffect } from 'react';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Transaction, TransactionType } from '../types';
import { useAuth } from '../hooks/useAuth';

const EXPENSE_CATEGORIES = [
  "Grocery",
  "Rent",
  "Gym",
  "Car Insurance",
  "Health Insurance",
  "Latitude",
  "Food",
  "IT Exp",
  "Astha",
  "Nepal",
  "Shopping",
  "Eating Out",
  "Fuel",
  "Sim Bill",
  "Internet Bill",
  "Electricity Bill",
  "Entertainment",
  "Subscriptions",
  "Medical/Pharmacy",
  "Personal Care",
  "Other"
];

const INCOME_CATEGORIES = [
  "Spas",
  "Kentford",
  "Other"
];

export const ExpenseTracker = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [type, setType] = useState<TransactionType>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    setCategory(newType === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0]);
  };
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from Firebase Firestore
  useEffect(() => {
    if (!user) return;

    // We removed orderBy to prevent Firebase requiring a Composite Index, which was failing silently.
    const q = query(
      collection(db, 'expenses'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Transaction[] = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          type: d.type || 'expense',
          description: d.description,
          amount: d.amount,
          category: d.category,
          date: d.date,
          notes: d.notes || '',
          createdAt: d.createdAt?.toMillis ? d.createdAt.toMillis() : Date.now()
        };
      });
      
      // Sort locally in descending order by date or creation time
      data.sort((a: any, b: any) => b.createdAt - a.createdAt);

      setTransactions(data);
      setIsLoading(false);
    }, (error) => {
      console.error('Error fetching transactions:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !category || !date || !user) return;

    const newTransaction = {
      userId: user.uid,
      type,
      description,
      amount: parseFloat(amount),
      category,
      date,
      notes,
      createdAt: new Date()
    };

    try {
      await addDoc(collection(db, 'expenses'), newTransaction);
      setDescription('');
      setAmount('');
      setNotes('');
      // keep the date and category as they were for convenience
    } catch (e: any) {
      console.error('Error adding document: ', e);
      alert("Firebase Error (Add Transaction): " + e.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'expenses', id));
    } catch (e: any) {
      console.error('Error deleting document: ', e);
      alert("Firebase Error (Delete Transaction): " + e.message);
    }
  };

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <>
      <section className="card" style={{ marginBottom: '2rem' }}>
        <div className="section-header">
          <div>
            <h2>Log Transaction</h2>
            <p className="muted">Track your daily income and spendings in the cloud.</p>
          </div>
        </div>
        <form onSubmit={handleAddTransaction} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          
          <div style={{ gridColumn: '1 / -1' }}>
             <div className="tabs" role="tablist" style={{ justifyContent: 'flex-start', borderBottom: 'none' }}>
                <button
                  type="button"
                  role="tab"
                  className={`tab ${type === 'expense' ? 'tab--active' : ''}`}
                  onClick={() => handleTypeChange('expense')}
                >
                  Expense
                </button>
                <button
                  type="button"
                  role="tab"
                  className={`tab ${type === 'income' ? 'tab--active' : ''}`}
                  onClick={() => handleTypeChange('income')}
                >
                  Income
                </button>
              </div>
          </div>

          <div>
            <label className="muted" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem' }}>Description</label>
            <input 
              type="text" 
              style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Lunch"
              required
            />
          </div>
          <div>
            <label className="muted" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem' }}>Amount</label>
            <input 
              type="number" 
              step="0.01"
              min="0"
              style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>
          <div>
            <label className="muted" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem' }}>Category</label>
            <select 
              style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              {(type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="muted" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem' }}>Date</label>
            <input 
              type="date" 
              style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="muted" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem' }}>Notes (Optional)</label>
            <textarea 
              style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)', outline: 'none', resize: 'vertical', minHeight: '60px' }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any extra details..."
            />
          </div>
          
          <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
            <button type="submit" className="button" style={{ 
              width: '100%', 
              justifyContent: 'center', 
              backgroundColor: type === 'expense' ? 'var(--negative)' : 'var(--positive)' 
            }}>
              Add {type === 'expense' ? "Expense" : "Income"}
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="section-header">
          <div>
            <h2>Recent Transactions</h2>
            {isLoading 
              ? <p className="muted">Fetching from cloud...</p> 
              : <p className="muted">
                  Income: <strong style={{ color: 'var(--positive)' }}>${totalIncome.toFixed(2)}</strong> &nbsp; | &nbsp; 
                  Expense: <strong style={{ color: 'var(--negative)' }}>${totalExpense.toFixed(2)}</strong>
                </p>
            }
          </div>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th className="text-left">Date</th>
                <th className="text-left">Category</th>
                <th className="text-left">Description</th>
                <th className="text-left">Notes</th>
                <th className="text-right">Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                   <td colSpan={6} className="text-center muted" style={{ padding: '2rem' }}>Loading data...</td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center muted" style={{ padding: '2rem' }}>
                    No transactions found. Add one above!
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="text-left" style={{ whiteSpace: 'nowrap' }}>{new Date(t.date).toLocaleDateString()}</td>
                    <td className="text-left">{t.category}</td>
                    <td className="text-left font-medium">
                      <span style={{ 
                        display: 'inline-block', 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        marginRight: '8px',
                        backgroundColor: t.type === 'expense' ? 'var(--negative)' : 'var(--positive)' 
                      }}></span>
                      {t.description}
                    </td>
                    <td className="text-left muted small" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.notes}
                    </td>
                    <td className="text-right" style={{ color: t.type === 'expense' ? 'var(--negative)' : 'var(--positive)' }}>
                      {t.type === 'expense' ? '-' : '+'}${t.amount.toFixed(2)}
                    </td>
                    <td className="text-center">
                      <button 
                        type="button" 
                        onClick={() => handleDelete(t.id)}
                        className="button button--ghost icon-button"
                        style={{ color: 'var(--negative)', padding: '0.2rem 0.5rem' }}
                        title="Delete transaction"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
};
