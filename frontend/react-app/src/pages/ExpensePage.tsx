import { useState, useEffect, type FormEvent } from 'react';
import { api } from '../utils/api';

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

export default function ExpensePage() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);

    const [loading, setLoading] = useState<boolean>(true);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);

    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [categoryId, setCategoryId] = useState<number>(0);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [expData, catData] = await Promise.all([
                    api.expenses.getAll(),
                    api.categories.getAll()
                ]);
                setExpenses(expData);
                setCategories(catData);
            } catch (err: any) {
                setError("Kunde inte ladda data: " + err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const startEditing = (expense: Expense) => {
        setEditingId(expense.id);
        setDescription(expense.description);
        setAmount(expense.amount.toString());
        setDate(new Date(expense.date).toISOString().split('T')[0]);
        setCategoryId(expense.categoryId);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEditing = () => {
        setEditingId(null);
        resetForm();
    };

    const resetForm = () => {
        setDescription('');
        setAmount('');
        setDate(new Date().toISOString().split('T')[0]);
        setCategoryId(0);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        const parsedAmount = amount ? parseFloat(amount.replace(',', '.')) : 0;
        const payload = {
            description,
            amount: parsedAmount,
            date: new Date(date).toISOString(),
            categoryId
        };

        try {
            if (editingId) {
                await api.expenses.update(editingId, payload);
                const updatedList = await api.expenses.getAll();
                setExpenses(updatedList);
                setEditingId(null);
            } else {
                const savedExpense = await api.expenses.create(payload);
                setExpenses(prev => [savedExpense, ...prev]);
            }
            resetForm();
        } catch (err: any) {
            setError("Kunde inte spara: " + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Ta bort denna utgift?")) return;
        try {
            await api.expenses.delete(id);
            setExpenses(prev => prev.filter(e => e.id !== id));
        } catch (err: any) {
            setError(err.message);
        }
    };

    if (loading) return <div className="card"><p>Laddar...</p></div>;

    return (
        <div className="view-container">
            {error && <div style={{ background: '#ef4444', color: 'white', padding: '10px', borderRadius: '6px', marginBottom: '1rem' }}>{error}</div>}

            <section className="card" style={{ marginBottom: '2rem' }}>
                <h2 style={{ marginTop: 0 }}>{editingId ? 'Redigera utgift' : 'Ny utgift'}</h2>

                <form onSubmit={handleSubmit}>
                    <div className="expense-form-grid">

                        <div className="form-group">
                            <label>Vad?</label>
                            <input
                                type="text"
                                placeholder="T.ex. Lunch"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label>Belopp</label>
                            <input
                                type="number"
                                placeholder="0"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                required
                                step="0.01"
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label>Datum</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label>Kategori</label>
                            <select
                                value={categoryId}
                                onChange={(e) => setCategoryId(Number(e.target.value))}
                                required
                                className="form-input"
                            >
                                <option value={0}>🤖 Låt AI gissa...</option>
                                <option disabled>──────────────</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        {/* Knappar */}
                        <div className="form-group" style={{ flexDirection: 'row', gap: '10px' }}>
                            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ flex: 1 }}>
                                {submitting ? '...' : (editingId ? 'Spara' : 'Lägg till')}
                            </button>
                            {editingId && (
                                <button type="button" className="btn" onClick={cancelEditing} style={{ background: '#94a3b8', color: 'white' }}>
                                    X
                                </button>
                            )}
                        </div>

                    </div>
                </form>
            </section>

            <section className="card">
                <h3 style={{ marginTop: 0 }}>Alla utgifter</h3>
                <div className="table-wrapper">
                    <table className="expense-table">
                        <thead>
                            <tr>
                                <th>Datum</th>
                                <th>Beskrivning</th>
                                <th>Kategori</th>
                                <th>Belopp</th>
                                <th>Val</th>
                            </tr>
                        </thead>
                        <tbody>
                            {expenses.map(e => (
                                <tr key={e.id}>
                                    <td>{new Date(e.date).toLocaleDateString()}</td>
                                    <td>{e.description}</td>
                                    <td><span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>{e.category?.name || 'Övrigt'}</span></td>
                                    <td style={{ fontWeight: 'bold' }}>{e.amount} kr</td>
                                    <td>
                                        <button className="btn btn-warning" onClick={() => startEditing(e)} style={{ padding: '4px 8px', marginRight: '5px' }}>✏️</button>
                                        <button className="btn btn-danger" onClick={() => handleDelete(e.id)} style={{ padding: '4px 8px' }}>🗑️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}