import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from 'react';
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

interface ReceiptLineItem {
    name: string;
    price: number;
    discount: number;
    finalPrice: number;
}

interface ParsedReceipt {
    store: string | null;
    date: string | null;
    totalAmount: number;
    totalDiscount: number;
    items: ReceiptLineItem[] | null;
}

export default function ExpensePage() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);

    const [loading, setLoading] = useState<boolean>(true);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [analyzingReceipt, setAnalyzingReceipt] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);

    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [categoryId, setCategoryId] = useState<number>(0);

    const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Hantera uppladdning och AI-analys av kvitto
    const handleReceiptUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setAnalyzingReceipt(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const parsed: ParsedReceipt = await api.expenses.uploadReceipt(file);

            // 1. Fyll i beskrivning (butiksnamn)
            if (parsed.store) {
                setDescription(parsed.store);
            }

            // 2. Fyll i belopp
            if (parsed.totalAmount) {
                setAmount(parsed.totalAmount.toString());
            }

            // 3. Fyll i datum om det finns
            if (parsed.date) {
                // Säkerställ YYYY-MM-DD
                const cleanDate = parsed.date.split('T')[0];
                setDate(cleanDate);
            }

            // 4. Försök matcha mot en befintlig kategori i listan (t.ex. "Mat" eller "Livsmedel")
            const storeLower = (parsed.store || '').toLowerCase();
            const matchedCat = categories.find(c => {
                const name = c.name.toLowerCase();
                if (storeLower.includes('ica') || storeLower.includes('coop') || storeLower.includes('willys')) {
                    return name === 'mat' || name === 'livsmedel';
                }
                return false;
            });

            if (matchedCat) {
                setCategoryId(matchedCat.id);
            } else {
                setCategoryId(0); // Låt backend gissa om ingen matchning hittades direkt
            }

            setSuccessMessage(`Avläsning klar! Fyllde i ${parsed.store || 'kvittot'} (${parsed.totalAmount} kr).`);
        } catch (err: any) {
            setError("Kvittoanalys misslyckades: " + err.message);
        } finally {
            setAnalyzingReceipt(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

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
        setSuccessMessage(null);
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
            {error && (
                <div style={{ background: '#ef4444', color: 'white', padding: '10px', borderRadius: '6px', marginBottom: '1rem' }}>
                    {error}
                </div>
            )}

            {successMessage && (
                <div style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', padding: '10px', borderRadius: '6px', marginBottom: '1rem' }}>
                    {successMessage}
                </div>
            )}

            <section className="card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ margin: 0 }}>{editingId ? 'Redigera utgift' : 'Ny utgift'}</h2>

                    {/* Snabbknapp för kvitto/skärmdump */}
                    {!editingId && (
                        <div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={handleReceiptUpload}
                                disabled={analyzingReceipt}
                            />
                            <button
                                type="button"
                                className="btn"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={analyzingReceipt}
                                style={{
                                    backgroundColor: '#0284c7',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 14px',
                                    cursor: analyzingReceipt ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {analyzingReceipt ? '⏳ Läser av kvitto...' : '📸 Läs av Kivra-kvitto'}
                            </button>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="expense-form-grid">

                        <div className="form-group">
                            <label>Vad?</label>
                            <input
                                type="text"
                                placeholder="T.ex. ICA Kvantum"
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
                            <button type="submit" className="btn btn-primary" disabled={submitting || analyzingReceipt} style={{ flex: 1 }}>
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