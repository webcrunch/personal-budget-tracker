import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                // Hämta både budgetar och utgifter parallellt
                const [budgetData, expenseData] = await Promise.all([
                    api.budgets.getAll(),
                    api.expenses.getAll()
                ]);
                setBudgets(budgetData);
                setExpenses(expenseData);
            } catch (err: any) {
                console.error("Fel vid laddning:", err);
                setError("Kunde inte hämta budget- eller utgiftsdata: " + err.message);
            } finally {
                setLoading(false);
            }
        };

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

    // Hjälpfunktion för att räkna ut spenderat belopp för en specifik budget
    const calculateSpent = (budget: Budget): number => {
        const start = new Date(budget.startDate).getTime();
        // Sätt endDate till slutet av dygnet (23:59:59) så inte sista dagen klipps
        const end = new Date(budget.endDate);
        end.setHours(23, 59, 59, 999);
        const endTime = end.getTime();

        return expenses
            .filter(exp => {
                const expTime = new Date(exp.date).getTime();
                const inDateRange = expTime >= start && expTime <= endTime;

                // Om budgeten är låst till en kategori, matcha på den.
                // Om budgeten saknar categoryId (eller är 0/null), räkna alla kategorier.
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {budgets.map(budget => {
                        const spent = calculateSpent(budget);
                        const remaining = budget.amount - spent;

                        // Räkna ut procent kvar (från 100% ned till 0%)
                        const percentageRemaining = Math.max(0, Math.min(100, (remaining / budget.amount) * 100));

                        // Färgkodning: Grön -> Gul/Orange -> Röd
                        let barColor = '#10b981'; // Grön (> 40% kvar)
                        if (percentageRemaining <= 40 && percentageRemaining > 15) {
                            barColor = '#f59e0b'; // Gul / Varning
                        } else if (percentageRemaining <= 15) {
                            barColor = '#ef4444'; // Röd / Kritisk eller spräckt
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
                                        📅 {new Date(budget.startDate).toLocaleDateString()} – {new Date(budget.endDate).toLocaleDateString()}
                                    </p>
                                    <p style={{ margin: 0 }}>
                                        🏷️ <strong>Kategori:</strong> {budget.category?.name || 'Generell (Alla)'}
                                    </p>
                                </div>

                                {/* Status över kvarvarande belopp */}
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

                                {/* Progress Bar: Går från full bredd (100%) nedåt mot 0% */}
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
                                        ⚠️ Budgeten har överskridits med {Math.abs(remaining).toLocaleString()} kr!
                                    </div>
                                )}

                                {/* Åtgärder */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                    <button
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