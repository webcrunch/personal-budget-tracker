import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from './utils/api';

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

interface Budget {
    id: number;
    name: string;
    amount: number;
    startDate: string;
    endDate: string;
    categoryId?: number;
    category?: Category;
}

export default function BudgetManage() {
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    // State för inline-redigering
    const [editingBudgetId, setEditingBudgetId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editAmount, setEditAmount] = useState<number>(0);
    const [editStartDate, setEditStartDate] = useState('');
    const [editEndDate, setEditEndDate] = useState('');
    const [editCategoryId, setEditCategoryId] = useState<string>('');

    const loadData = async () => {
        try {
            setLoading(true);
            const [budgetData, expenseData, categoryData] = await Promise.all([
                api.budgets.getAll(),
                api.expenses.getAll(),
                api.categories.getAll()
            ]);
            setBudgets(budgetData || []);
            setExpenses(expenseData || []);
            setCategories(categoryData || []);
        } catch (err: any) {
            console.error("Fel vid laddning:", err);
            setError("Kunde inte hämta budget- eller utgiftsdata: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleDelete = async (id: number) => {
        if (!window.confirm("Vill du verkligen ta bort denna budget?")) return;
        try {
            await api.budgets.delete(id);
            setBudgets(prev => prev.filter(b => b.id !== id));
        } catch (err: any) {
            alert("Kunde inte radera budget: " + err.message);
        }
    };

    const startEdit = (budget: Budget) => {
        setEditingBudgetId(budget.id);
        setEditName(budget.name);
        setEditAmount(budget.amount);
        setEditStartDate(budget.startDate.split('T')[0]);
        setEditEndDate(budget.endDate.split('T')[0]);
        setEditCategoryId(budget.categoryId ? budget.categoryId.toString() : '');
    };

    const cancelEdit = () => {
        setEditingBudgetId(null);
    };

    const handleSaveEdit = async (id: number) => {
        try {
            const updatedPayload = {
                id,
                name: editName,
                amount: Number(editAmount),
                startDate: new Date(editStartDate).toISOString(),
                endDate: new Date(editEndDate).toISOString(),
                categoryId: editCategoryId === '' ? null : Number(editCategoryId)
            };

            await api.budgets.update(id, updatedPayload);
            setEditingBudgetId(null);
            await loadData();
        } catch (err: any) {
            alert("Kunde inte uppdatera budget: " + err.message);
        }
    };

    const calculateSpent = (budget: Budget): number => {
        const start = new Date(budget.startDate).getTime();
        const end = new Date(budget.endDate);
        end.setHours(23, 59, 59, 999);
        const endTime = end.getTime();

        return expenses
            .filter(exp => {
                const expTime = new Date(exp.date).getTime();
                const inDateRange = expTime >= start && expTime <= endTime;

                const matchesCategory = budget.categoryId
                    ? exp.categoryId === budget.categoryId
                    : true;

                return inDateRange && matchesCategory;
            })
            .reduce((sum, exp) => sum + exp.amount, 0);
    };

    if (loading) return <p style={{ padding: '2rem' }}>Laddar budgetar...</p>;

    return (
        <div className="card">
            {error && (
                <div style={{ background: '#ef4444', color: 'white', padding: '10px', borderRadius: '6px', marginBottom: '1rem' }}>
                    {error}
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '1.5rem' }}>
                <h1 style={{ margin: 0 }}>Hantera Budgetar</h1>
                <button className="btn btn-primary" onClick={() => navigate('/budgets/create')}>+ Skapa Ny</button>
            </div>

            {budgets.length === 0 ? (
                <p>Inga budgetar hittades.</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                    {budgets.map(budget => {
                        const isEditing = editingBudgetId === budget.id;

                        if (isEditing) {
                            return (
                                <div key={budget.id} style={{
                                    border: '2px solid #3b82f6',
                                    padding: '20px',
                                    borderRadius: '12px',
                                    background: '#f8fafc',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}>
                                    <h3 style={{ margin: '0 0 12px 0', color: '#1e293b', fontSize: '1.1rem' }}>Redigera budget</h3>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Namn</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={editName}
                                                onChange={e => setEditName(e.target.value)}
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Belopp (kr)</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={editAmount}
                                                onChange={e => setEditAmount(Number(e.target.value))}
                                                required
                                            />
                                        </div>

                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Start</label>
                                                <input
                                                    type="date"
                                                    className="form-input"
                                                    value={editStartDate}
                                                    onChange={e => setEditStartDate(e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Slut</label>
                                                <input
                                                    type="date"
                                                    className="form-input"
                                                    value={editEndDate}
                                                    onChange={e => setEditEndDate(e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Kategori</label>
                                            <select
                                                className="form-input"
                                                value={editCategoryId}
                                                onChange={e => setEditCategoryId(e.target.value)}
                                            >
                                                <option value="">-- Generell budget (Alla kategorier) --</option>
                                                {categories.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                            <button
                                                type="button"
                                                className="btn btn-primary"
                                                onClick={() => handleSaveEdit(budget.id)}
                                                style={{ flex: 1, padding: '8px 12px', fontSize: '0.9rem' }}
                                            >
                                                Spara ändringar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={cancelEdit}
                                                style={{ flex: 1, padding: '8px 12px', fontSize: '0.9rem', background: '#94a3b8', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                            >
                                                Avbryt
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        const spent = calculateSpent(budget);
                        const remaining = budget.amount - spent;
                        const percentageRemaining = Math.max(0, Math.min(100, (remaining / budget.amount) * 100));

                        let barColor = '#10b981';
                        if (percentageRemaining <= 40 && percentageRemaining > 15) {
                            barColor = '#f59e0b';
                        } else if (percentageRemaining <= 15) {
                            barColor = '#ef4444';
                        }

                        const isOverBudget = remaining < 0;

                        return (
                            <div key={budget.id} style={{
                                border: isOverBudget ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                                padding: '20px',
                                borderRadius: '12px',
                                background: isOverBudget ? '#fff5f5' : '#fafafa',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                                    <h3 style={{ margin: 0, color: '#0f172a' }}>{budget.name}</h3>
                                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                        Start: {budget.amount.toLocaleString()} kr
                                    </span>
                                </div>

                                <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '15px' }}>
                                    <p style={{ margin: '0 0 4px 0' }}>
                                        📅 {new Date(budget.startDate).toLocaleDateString('sv-SE')} – {new Date(budget.endDate).toLocaleDateString('sv-SE')}
                                    </p>
                                    <p style={{ margin: 0 }}>
                                        🏷️ <strong>Kategori:</strong> {budget.category?.name || 'Generell (Alla)'}
                                    </p>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569' }}>
                                        Kvar att spendera:
                                    </span>
                                    <span style={{
                                        fontWeight: 'bold',
                                        fontSize: '1.15rem',
                                        color: isOverBudget ? '#b91c1c' : '#0f172a'
                                    }}>
                                        {remaining.toLocaleString()} kr
                                    </span>
                                </div>

                                <div style={{
                                    background: '#e2e8f0',
                                    height: '10px',
                                    borderRadius: '5px',
                                    overflow: 'hidden',
                                    marginBottom: '8px'
                                }}>
                                    <div style={{
                                        background: barColor,
                                        width: `${percentageRemaining}%`,
                                        height: '100%',
                                        transition: 'width 0.4s ease-in-out'
                                    }} />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginBottom: '16px' }}>
                                    <span>Spenderat: {spent.toLocaleString()} kr</span>
                                    <span>{percentageRemaining.toFixed(0)}% kvar</span>
                                </div>

                                {isOverBudget && (
                                    <div style={{
                                        background: '#fee2e2',
                                        color: '#991b1b',
                                        padding: '6px 10px',
                                        borderRadius: '6px',
                                        fontSize: '0.8rem',
                                        marginBottom: '14px',
                                        fontWeight: 500
                                    }}>
                                        ⚠️️ Budgeten har överskridits med {Math.abs(remaining).toLocaleString()} kr!
                                    </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                    <button
                                        type="button"
                                        onClick={() => startEdit(budget)}
                                        style={{
                                            padding: '6px 12px',
                                            fontSize: '0.85rem',
                                            background: '#f1f5f9',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            color: '#334155'
                                        }}
                                    >
                                        Ändra
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-danger"
                                        onClick={() => handleDelete(budget.id)}
                                        style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                                    >
                                        Ta bort
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}