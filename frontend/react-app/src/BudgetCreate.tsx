import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:5015/api';

export default function BudgetCreate() {
    const navigate = useNavigate();
    const [categories, setCategories] = useState<{ id: number, name: string }[]>([]);
    const [formData, setFormData] = useState({
        name: '',
        amount: 0,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        categoryId: '' // Använd tom sträng för att hantera "ingen vald" initialt
    });

    useEffect(() => {
        fetch(`${API_BASE_URL}/categories`)
            .then(res => res.json())
            .then(data => setCategories(data));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const response = await fetch(`${API_BASE_URL}/Budget`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...formData,
                categoryId: formData.categoryId === '' ? null : Number(formData.categoryId),
                amount: Number(formData.amount)
            })
        });

        if (response.ok) navigate('/budgets');
    };

    return (
        <div className="card">
            <h1>Skapa Budget</h1>
            <form onSubmit={handleSubmit} className="expense-form">

                <input
                    type="text"
                    placeholder="Namn (t.ex. Mat Jan)"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="form-input"
                />

                <input
                    type="number"
                    placeholder="Belopp"
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                    required
                    className="form-input"
                />

                {/* Wrappar datumfälten för att label och input ska sitta ihop snyggt på mobilen */}
                <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 200px' }}>
                    <label style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>Startdatum</label>
                    <input
                        type="date"
                        value={formData.startDate}
                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                        required
                        className="form-input"
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 200px' }}>
                    <label style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>Slutdatum</label>
                    <input
                        type="date"
                        value={formData.endDate}
                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                        required
                        className="form-input"
                    />
                </div>

                <select
                    value={formData.categoryId}
                    onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                    className="form-input"
                >
                    <option value="">-- Generell budget (Alla kategorier) --</option>
                    {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>

                <button type="submit" className="btn btn-primary">Spara Budget</button>
                <button type="button" className="btn" onClick={() => navigate('/budgets')} style={{ backgroundColor: '#94a3b8' }}>Avbryt</button>
            </form>
        </div>
    );
}