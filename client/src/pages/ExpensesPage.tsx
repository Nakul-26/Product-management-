import { FormEvent, useEffect, useMemo, useState } from 'react';
import api from '../api/api';
import { Expense, ExpenseCategory, ExpenseListResponse } from '../types';

const categories: ExpenseCategory[] = ['rent', 'utilities', 'salary', 'transport', 'misc', 'other'];

function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('misc');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadExpenses = async () => {
    const response = await api.get<ExpenseListResponse>('/expenses', { params: { page: 1, limit: 30 } });
    setExpenses(response.data.data);
  };

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      try {
        await loadExpenses();
      } catch (requestError: any) {
        setError(requestError?.response?.data?.error || requestError?.message || 'Failed to load expenses');
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  const totals = useMemo(
    () => expenses.reduce((sum, expense) => sum + expense.amount, 0),
    [expenses]
  );

  const submitExpense = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount) || numericAmount < 0) {
      setError('Amount must be a valid non-negative number.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/expenses', {
        title: title.trim(),
        category,
        amount: numericAmount,
        expenseDate: expenseDate || undefined,
        notes: notes.trim() || undefined
      });
      setTitle('');
      setCategory('misc');
      setAmount('');
      setExpenseDate('');
      setNotes('');
      setNotice('Expense added successfully.');
      await loadExpenses();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.error || requestError?.message || 'Failed to create expense.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app">
      <header>
        <h1>Expenses</h1>
        <p>Record operating costs and convert gross profit into net profit on dashboard analytics.</p>
      </header>

      {error && <p className="error-text">{error}</p>}
      {notice && <p className="success-text">{notice}</p>}

      <section className="purchases-layout">
        <article className="panel">
          <h2>Add Expense</h2>
          <form className="form-grid" onSubmit={submitExpense}>
            <label>
              Title *
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Shop rent, electricity bill, salary, etc." required />
            </label>
            <label>
              Category
              <select value={category} onChange={(event) => setCategory(event.target.value as ExpenseCategory)}>
                {categories.map((entry) => (
                  <option key={entry} value={entry}>{entry}</option>
                ))}
              </select>
            </label>
            <label>
              Amount *
              <input type="number" min={0} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required />
            </label>
            <label>
              Expense Date
              <input type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} />
            </label>
            <label className="full-width">
              Notes
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional memo" />
            </label>
            <div className="form-actions full-width">
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Expense'}</button>
            </div>
          </form>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>Expense History</h2>
            <button type="button" className="btn btn-light" onClick={loadExpenses} disabled={loading}>Refresh</button>
          </div>
          <p className="muted"><strong>Total (latest records):</strong> ₹{totals.toFixed(2)}</p>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Title</th>
                <th>Category</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="muted">No expenses recorded yet.</td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense._id}>
                    <td>{new Date(expense.expenseDate || expense.createdAt || '').toLocaleDateString()}</td>
                    <td>{expense.title}</td>
                    <td>{expense.category}</td>
                    <td>₹{expense.amount.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </article>
      </section>
    </main>
  );
}

export default ExpensesPage;
