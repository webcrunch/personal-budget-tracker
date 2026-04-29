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

    // --- SMARTA STATE (Behålls för att slippa 0-problemet) ---
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [categoryId, setCategoryId] = useState<number>(0);

    // 1. Hämta data
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

    // 2. Fyll formuläret vid redigering
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

    // 3. Spara
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
            {error && <div className="error-banner" style={{ background: '#d32f2f', color: 'white', padding: '10px', borderRadius: '5px', marginBottom: '20px' }}>{error}</div>}

            <section className="form-section card">
                <h2>{editingId ? 'Redigera utgift' : 'Ny utgift'}</h2>

                <form onSubmit={handleSubmit} className="expense-form">

                    {/* FLEX CONTAINER: Lägger allt på en rad (som bild 1) */}
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>

                        {/* 1. BESKRIVNING (Får ta mest plats: flex: 2) */}
                        <div style={{ flex: 2, minWidth: '200px' }}>
                            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Vad?</label>
                            <input
                                type="text"
                                placeholder="T.ex. Lunch"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                                style={{ width: '100%' }} // Fyller sin flex-box
                            />
                        </div>

                        {/* 2. BELOPP (Smalare: flex: 1) */}
                        <div style={{ flex: 1, minWidth: '100px' }}>
                            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Belopp</label>
                            <input
                                type="number"
                                placeholder="0"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                required
                                step="0.01"
                                style={{ width: '100%' }}
                            />
                        </div>

                        {/* 3. DATUM (Smalare: flex: 1) */}
                        <div style={{ flex: 1, minWidth: '130px' }}>
                            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Datum</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                                style={{ width: '100%' }}
                            />
                        </div>

                        {/* 4. KATEGORI (Lite bredare: flex: 1.5) */}
                        <div style={{ flex: 1.5, minWidth: '180px' }}>
                            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Kategori</label>
                            <select
                                value={categoryId}
                                onChange={(e) => setCategoryId(Number(e.target.value))}
                                required
                                style={{ width: '100%' }}
                            >
                                <option value={0}>🤖 Låt AI gissa...</option>
                                <option disabled>──────────────</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* 5. KNAPPAR (Ingen label, alignas i botten via flex-end) */}
                        <div style={{ paddingBottom: '2px' }}>
                            <button type="submit" className="btn-save" disabled={submitting} style={{ height: '42px', whiteSpace: 'nowrap' }}>
                                {submitting ? '🤖...' : (editingId ? 'Spara' : 'Spara')}
                            </button>

                            {editingId && (
                                <button type="button" onClick={cancelEditing} style={{ marginLeft: '10px', padding: '10px', height: '42px', cursor: 'pointer' }}>
                                    X
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </section>

            {/* TABELLEN (Oförändrad) */}
            <section className="list-section card" style={{ marginTop: '20px' }}>
                <h3>Alla utgifter</h3>
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
                        {expenses.length === 0 ? (
                            <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>Inga utgifter än.</td></tr>
                        ) : (
                            expenses.map(e => (
                                <tr key={e.id}>
                                    <td>{new Date(e.date).toLocaleDateString()}</td>
                                    <td>{e.description}</td>
                                    <td><span className="category-badge">{e.category?.name || 'Övrigt'}</span></td>
                                    <td style={{ fontWeight: 'bold' }}>{e.amount} kr</td>
                                    <td>
                                        <button onClick={() => startEditing(e)} style={{ marginRight: '5px' }}>✏️</button>
                                        <button onClick={() => handleDelete(e.id)}>🗑️</button>
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