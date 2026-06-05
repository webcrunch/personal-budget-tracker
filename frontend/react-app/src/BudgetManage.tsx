import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Category {
    id: number;
    name: string;
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

const API_BASE_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:5015/api';

export default function BudgetManage() {
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchBudgets = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/budgets`);
                if (response.ok) {
                    const data = await response.json();
                    setBudgets(data);
                }
            } catch (error) {
                console.error("Fel vid hämtning av budgetar:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchBudgets();
    }, []);

    const handleDelete = async (id: number) => {
        if (!window.confirm("Vill du verkligen ta bort denna budget?")) return;
        await fetch(`${API_BASE_URL}/Budget/${id}`, { method: 'DELETE' });
        setBudgets(prev => prev.filter(b => b.id !== id));
    };

    if (loading) return <p style={{ padding: '2rem' }}>Laddar budgetar...</p>;

    return (
        <div className="card">
            {/* Header-sektion som anpassar sig snyggt */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '1.5rem' }}>
                <h1 style={{ margin: 0 }}>Hantera Budgetar</h1>
                <button className="btn btn-primary" onClick={() => navigate('/budgets/create')}>+ Skapa Ny</button>
            </div>

            {budgets.length === 0 ? (
                <p>Inga budgetar hittades.</p>
            ) : (
                /* Grid-layout för budgetkorten - lägger sig bredvid varandra på stor skärm, under varandra på mobil */
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                    {budgets.map(budget => (
                        <div key={budget.id} style={{ border: '1px solid #e2e8f0', padding: '20px', borderRadius: '12px', background: '#fafafa' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
                                <h3 style={{ margin: 0, color: '#0f172a' }}>{budget.name}</h3>
                                <span style={{ fontWeight: 'bold', color: '#3b82f6', fontSize: '1.1rem' }}>{budget.amount} kr</span>
                            </div>

                            <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '15px' }}>
                                <p style={{ margin: '0 0 5px 0' }}>{new Date(budget.startDate).toLocaleDateString()} - {new Date(budget.endDate).toLocaleDateString()}</p>
                                <p style={{ margin: 0 }}><strong>Kategori:</strong> {budget.category?.name || 'Generell (Alla)'}</p>
                            </div>

                            {/* Enkel Progress Bar (statisk för nu) */}
                            <div style={{ background: '#e2e8f0', height: '8px', borderRadius: '4px', overflow: 'hidden', marginBottom: '15px' }}>
                                <div style={{ background: '#10b981', width: '45%', height: '100%' }}></div>
                            </div>

                            {/* Åtgärdsknappar */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button className="btn btn-danger" onClick={() => handleDelete(budget.id)} style={{ padding: '8px 12px', fontSize: '0.9rem' }}>
                                    Ta bort
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}