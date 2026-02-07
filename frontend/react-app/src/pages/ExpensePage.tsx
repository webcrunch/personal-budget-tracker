import { useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { api } from '../utils/api.ts'; // Justera sökvägen om din api.ts ligger någon annanstans

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
    categoryId: 0, // 0 = "Låt AI gissa"
};

export default function ExpensePage() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [newExpense, setNewExpense] = useState(initialNewExpenseState);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [submitting, setSubmitting] = useState<boolean>(false);

    // Hämta data vid start
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
        setError(null);

        const currentData = editingExpense || newExpense;
        const payload = {
            ...currentData,
            date: new Date(currentData.date).toISOString()
        };

        try {
            if (editingExpense) {
                // Uppdatera befintlig
                await api.expenses.update(editingExpense.id, payload);
                // Hämta listan på nytt för att se ändringar (inkl AI-kategorisering om ID ändrats)
                const updatedList = await api.expenses.getAll();
                setExpenses(updatedList);
                setEditingExpense(null);
            } else {
                // Skapa ny
                const savedExpense = await api.expenses.create(payload);
                setExpenses(prev => [...prev, savedExpense]);
                setNewExpense(initialNewExpenseState);
            }
        } catch (err: any) {
            setError("Kunde inte spara: " + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Är du säker på att du vill radera utgiften?")) return;
        try {
            await api.expenses.delete(id);
            setExpenses(prev => prev.filter(e => e.id !== id));
        } catch (err: any) {
            setError("Kunde inte radera: " + err.message);
        }
    };

    if (loading) return <div className="card"><p>Laddar ekonomi-data...</p></div>;

    const currentForm = editingExpense || newExpense;

    return (
        <div className="view-container">
            {error && <div className="error-banner" style={{ color: 'white', background: '#e55', padding: '10px', borderRadius: '5px', marginBottom: '20px' }}>{error}</div>}

            <section className="form-section card">
                <h2>{editingExpense ? 'Redigera utgift' : 'Ny utgift'}</h2>
                <form onSubmit={handleSubmit} className="expense-form">
                    <div className="input-group">
                        <input type="text" name="description" placeholder="Beskrivning (t.ex. ICA)" value={currentForm.description} onChange={handleChange} required />
                        <input type="number" name="amount" placeholder="Belopp" value={currentForm.amount} onChange={handleChange} required />
                        <input type="date" name="date" value={currentForm.date} onChange={handleChange} required />

                        <select name="categoryId" value={currentForm.categoryId} onChange={handleChange} required>
                            <option value={0}>🤖 Låt AI gissa kategori...</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="button-group" style={{ marginTop: '15px' }}>
                        <button type="submit" className="btn-save" disabled={submitting}>
                            {submitting ? 'Sparar (AI analyserar)...' : 'Spara utgift'}
                        </button>
                        {editingExpense && (
                            <button type="button" className="btn-cancel" onClick={() => setEditingExpense(null)} style={{ background: '#667', marginLeft: '10px' }}>
                                Avbryt
                            </button>
                        )}
                    </div>
                </form>
            </section>

            <section className="list-section card" style={{ marginTop: '20px' }}>
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
                        {expenses.length === 0 ? (
                            <tr><td colSpan={5} style={{ textAlign: 'center' }}>Inga utgifter registrerade.</td></tr>
                        ) : (
                            expenses.map(e => (
                                <tr key={e.id}>
                                    <td>{new Date(e.date).toLocaleDateString()}</td>
                                    <td>{e.description}</td>
                                    <td className="category-cell">
                                        <span className="category-badge">{e.category?.name || 'Övrigt'}</span>
                                    </td>
                                    <td style={{ fontWeight: 'bold' }}>{e.amount} SEK</td>
                                    <td>
                                        <button className="btn-edit" onClick={() => {
                                            setEditingExpense({ ...e, date: new Date(e.date).toISOString().split('T')[0] });
                                        }}>Redigera</button>
                                        <button className="btn-delete" onClick={() => handleDelete(e.id)} style={{ marginLeft: '5px' }}>Radera</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </section>
        </div>
    );
}