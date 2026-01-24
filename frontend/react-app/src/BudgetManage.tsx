import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';

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

    if (loading) return <p>Laddar budgetar...</p>;

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>Hantera Budgetar</h1>
                <button onClick={() => navigate('/budgets/create')}>+ Skapa Ny</button>
            </div>

            {budgets.length === 0 ? (
                <p>Inga budgetar hittades.</p>
            ) : (
                <div style={{ display: 'grid', gap: '20px', marginTop: '20px' }}>
                    {budgets.map(budget => (
                        <div key={budget.id} className="budget-card" style={{ border: '1px solid #e2e8f0', padding: '15px', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <h3>{budget.name}</h3>
                                <span>{budget.amount} SEK</span>
                            </div>
                            <p><small>{new Date(budget.startDate).toLocaleDateString()} - {new Date(budget.endDate).toLocaleDateString()}</small></p>
                            <p><strong>Kategori:</strong> {budget.category?.name || 'Alla'}</p>

                            {/* Enkel Progress Bar (statisk för nu) */}
                            <div style={{ background: '#eee', height: '10px', borderRadius: '5px', marginTop: '10px' }}>
                                <div style={{ background: '#3b82f6', width: '45%', height: '100%', borderRadius: '5px' }}></div>
                            </div>

                            <div style={{ marginTop: '15px' }}>
                                <button className="btn-delete" onClick={() => handleDelete(budget.id)}>Ta bort</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}