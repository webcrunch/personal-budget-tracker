import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import type { FormEvent, ChangeEvent } from 'react';
import BudgetManage from './BudgetManage';
import BudgetCreate from './BudgetCreate';
import './App.css';

// --- GRÄNSSNITT ---
interface Category {
  id: number;
  name: string;
}

interface Expense {
  id: number;
  description: string;
  amount: number;
  date: string;
  categoryId: number;
  category?: Category;
}

const initialNewExpenseState: Omit<Expense, 'id' | 'category'> = {
  description: '',
  amount: 0,
  date: new Date().toISOString().split('T')[0],
  categoryId: 0,
};

const API_BASE_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:5015/api';

// --- KOMPONENT: UTGIFTSHANTERING ---
function ExpenseView() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newExpense, setNewExpense] = useState(initialNewExpenseState);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [expRes, catRes] = await Promise.all([
          fetch(`${API_BASE_URL}/expenses`),
          fetch(`${API_BASE_URL}/categories`)
        ]);

        if (!expRes.ok || !catRes.ok) throw new Error("Kunde inte hämta data.");

        const expData = await expRes.json();
        const catData = await catRes.json();

        setExpenses(expData);
        setCategories(catData);
        if (catData.length > 0) setNewExpense(prev => ({ ...prev, categoryId: catData[0].id }));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const val = name === 'amount' || name === 'categoryId' ? Number(value) : value;
    if (editingExpense) {
      setEditingExpense(prev => prev ? { ...prev, [name]: val } : null);
    } else {
      setNewExpense(prev => ({ ...prev, [name]: val }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const expenseToSubmit = editingExpense || { ...newExpense, id: 0 };

    try {
      const url = editingExpense ? `${API_BASE_URL}/Expense/${editingExpense.id}` : `${API_BASE_URL}/Expense`;
      const method = editingExpense ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...expenseToSubmit, date: new Date(expenseToSubmit.date).toISOString() }),
      });

      if (!response.ok) throw new Error("Kunde inte spara.");

      if (method === 'POST') {
        const saved = await response.json();
        setExpenses(prev => [...prev, saved]);
      } else {
        const res = await fetch(`${API_BASE_URL}/expenses`);
        setExpenses(await res.json());
      }

      setNewExpense(initialNewExpenseState);
      setEditingExpense(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Radera?")) return;
    try {
      await fetch(`${API_BASE_URL}/Expense/${id}`, { method: 'DELETE' });
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (err: any) { setError(err.message); }
  };

  if (loading) return <p>Laddar...</p>;

  const currentForm = editingExpense || newExpense;

  return (
    <div className="view-container">
      <section className="form-section">
        <h2>{editingExpense ? 'Redigera' : 'Ny utgift'}</h2>
        <form onSubmit={handleSubmit} className="expense-form">
          <input type="text" name="description" placeholder="Beskrivning" value={currentForm.description} onChange={handleChange} required />
          <input type="number" name="amount" placeholder="Belopp" value={currentForm.amount} onChange={handleChange} required />
          <input type="date" name="date" value={currentForm.date} onChange={handleChange} required />
          <select name="categoryId" value={currentForm.categoryId} onChange={handleChange} required>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button type="submit" disabled={submitting}>{submitting ? 'Sparar...' : 'Spara'}</button>
          {editingExpense && <button onClick={() => setEditingExpense(null)}>Avbryt</button>}
        </form>
      </section>

      <section className="list-section">
        <h2>Alla utgifter</h2>
        <table className="expense-table">
          <thead>
            <tr>
              <th>Datum</th>
              <th>Beskrivning</th>
              <th>Kategori</th>
              <th>Belopp</th>
              <th>Åtgärder</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map(e => (
              <tr key={e.id}>
                <td>{new Date(e.date).toLocaleDateString()}</td>
                <td>{e.description}</td>
                <td>{e.category?.name || 'Övrigt'}</td>
                <td>{e.amount} SEK</td>
                <td>
                  <button className="btn-edit" onClick={() => {
                    setEditingExpense({ ...e, date: new Date(e.date).toISOString().split('T')[0] });
                  }}>Redigera</button>
                  <button className="btn-delete" onClick={() => handleDelete(e.id)}>Radera</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

// --- HUVUDKOMPONENT: APP ---
function App() {
  return (
    <Router>
      <div className="dashboard-layout">
        <aside className="sidebar">
          <div className="sidebar-brand">Smart Budget</div>
          <nav className="sidebar-nav">
            <Link to="/" className="nav-item">Översikt</Link>
            <Link to="/expenses" className="nav-item">Utgifter</Link>
            <Link to="/budgets" className="nav-item">Budgetar</Link>
            <Link to="/import" className="nav-item">AI Import</Link>
          </nav>
        </aside>

        <main className="main-content">
          <Routes>
            {/* Startsidan */}
            <Route path="/" element={<div className="card"><h1>Välkommen!</h1><p>Här kommer din ekonomiska översikt.</p></div>} />

            {/* Utgifter */}
            <Route path="/expenses" element={<ExpenseView />} />

            {/* Budgetar - Här har vi tagit bort dubbletten och använder dina riktiga komponenter */}
            <Route path="/budgets" element={<BudgetManage />} />
            <Route path="/budgets/create" element={<BudgetCreate />} />

            {/* Import */}
            <Route path="/import" element={<div className="card"><h1>AI-Driven Import</h1><p>Ladda upp CSV eller Excel för LLM-kategorisering.</p></div>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;