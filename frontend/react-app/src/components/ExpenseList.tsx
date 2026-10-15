import React, { useState } from 'react';
import { api } from '../utils/api';
import type { Expense, Category } from '../types';

interface ExpenseListProps {
  expenses: Expense[];
  categories: Category[];
  onDataChanged: () => Promise<void>;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, categories, onDataChanged }) => {
  const [expandedExpenseId, setExpandedExpenseId] = useState<number | null>(null);

  // Redigeringsläge
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<number>(0);
  const [editIsFixed, setEditIsFixed] = useState(false);
  const [editIsPending, setEditIsPending] = useState(false);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Är du säker på att du vill ta bort denna utgift?')) return;
    try {
      await api.expenses.delete(id);
      await onDataChanged();
    } catch (err) {
      console.error('Kunde inte ta bort:', err);
    }
  };

  const startEdit = (exp: Expense) => {
    setEditingId(exp.id);
    setEditDate(exp.date.split('T')[0]);
    setEditDescription(exp.description);
    setEditAmount(exp.amount.toString());
    setEditCategoryId(exp.categoryId || (exp.category?.id ?? 0));
    setEditIsFixed(exp.isFixed ?? false);
    setEditIsPending(exp.isPending ?? false);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: number) => {
    try {
      const original = expenses.find(e => e.id === id);
      const updatedExpense = {
        id,
        description: editDescription,
        amount: parseFloat(editAmount),
        date: new Date(editDate).toISOString(),
        categoryId: editCategoryId,
        isFixed: editIsFixed,
        isPending: editIsPending,
        items: original?.items
      };

      await api.expenses.update(id, updatedExpense);
      setEditingId(null);
      await onDataChanged();
    } catch (err: any) {
      console.error('Kunde inte uppdatera utgift:', err);
      alert('Kunde inte spara ändringarna.');
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedExpenseId(expandedExpenseId === id ? null : id);
  };

  return (
    <div className="card">
      <h2>Alla utgifter</h2>

      {/* DESKTOP-TABELL */}
      <div className="table-wrapper expense-table-desktop">
        <table className="expense-table">
          <thead>
            <tr>
              <th>Datum</th>
              <th>Beskrivning</th>
              <th>Kategori</th>
              <th>Status</th>
              <th>Belopp</th>
              <th>Åtgärder</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map(exp => (
              <React.Fragment key={exp.id}>
                {editingId === exp.id ? (
                  // INLINE REDIGERINGSLÄGE
                  <tr style={{ background: '#f0fdf4' }}>
                    <td>
                      <input 
                        type="date" 
                        className="form-input" 
                        style={{ padding: '4px 8px', fontSize: '0.85rem' }} 
                        value={editDate} 
                        onChange={e => setEditDate(e.target.value)} 
                      />
                    </td>
                    <td>
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ padding: '4px 8px', fontSize: '0.85rem', width: '90%' }} 
                        value={editDescription} 
                        onChange={e => setEditDescription(e.target.value)} 
                      />
                    </td>
                    <td>
                      <select 
                        className="form-input" 
                        style={{ padding: '4px 8px', fontSize: '0.85rem' }} 
                        value={editCategoryId} 
                        onChange={e => setEditCategoryId(parseInt(e.target.value))}
                      >
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <label style={{ fontSize: '0.75rem', display: 'block' }}>
                        <input type="checkbox" checked={editIsFixed} onChange={e => setEditIsFixed(e.target.checked)} /> Fast
                      </label>
                      <label style={{ fontSize: '0.75rem', display: 'block' }}>
                        <input type="checkbox" checked={editIsPending} onChange={e => setEditIsPending(e.target.checked)} /> Planerad
                      </label>
                    </td>
                    <td>
                      <input 
                        type="number" 
                        step="0.01" 
                        className="form-input" 
                        style={{ padding: '4px 8px', fontSize: '0.85rem', width: '100px' }} 
                        value={editAmount} 
                        onChange={e => setEditAmount(e.target.value)} 
                      />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button 
                          type="button" 
                          onClick={() => saveEdit(exp.id)} 
                          className="btn btn-primary" 
                          style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem' }}
                        >
                          Spara
                        </button>
                        <button 
                          type="button" 
                          onClick={cancelEdit} 
                          style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem', background: '#94a3b8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Avbryt
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  // ORDINARIE VISNINGSLÄGE
                  <tr>
                    <td>{new Date(exp.date).toLocaleDateString('sv-SE')}</td>
                    <td>
                      <strong>{exp.description}</strong>
                      {exp.items && exp.items.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(exp.id)}
                          style={{
                            marginLeft: '8px',
                            background: 'none',
                            border: 'none',
                            color: '#3b82f6',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            padding: 0,
                            textDecoration: 'underline'
                          }}
                        >
                          {expandedExpenseId === exp.id ? 'Dölj kvitto ▲' : `Kvitto (${exp.items.length} varor) ▼`}
                        </button>
                      )}
                    </td>
                    <td>{exp.category?.name || 'Okänd'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {exp.isFixed && (
                          <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: '#e0f2fe', color: '#0369a1', borderRadius: '4px', fontWeight: 600 }}>
                            🔁 Fast
                          </span>
                        )}
                        {exp.isPending && (
                          <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: '#fef3c7', color: '#b45309', borderRadius: '4px', fontWeight: 600 }}>
                            ⏳ Planerad
                          </span>
                        )}
                      </div>
                    </td>
                    <td><strong>{exp.amount.toFixed(2)} kr</strong></td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button 
                          onClick={() => startEdit(exp)} 
                          style={{ padding: '0.4rem 0.7rem', fontSize: '0.85rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', color: '#334155' }}
                        >
                          Ändra
                        </button>
                        <button 
                          onClick={() => handleDelete(exp.id)} 
                          className="btn btn-delete" 
                          style={{ padding: '0.4rem 0.7rem', fontSize: '0.85rem' }}
                        >
                          Ta bort
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Utfällt kvitto */}
                {expandedExpenseId === exp.id && exp.items && exp.items.length > 0 && (
                  <tr>
                    <td colSpan={6} style={{ background: '#f8fafc', padding: '1rem' }}>
                      <div className="receipt-drawer">
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#475569' }}>Kvittospecifikation:</h4>
                        {exp.items.map((it, idx) => (
                          <div key={idx} className="receipt-item-row">
                            <span>{it.name}</span>
                            <span>
                              {it.discount > 0 && (
                                <span className="receipt-discount-tag">-{it.discount.toFixed(2)} kr</span>
                              )}
                              <strong>{it.finalPrice.toFixed(2)} kr</strong>
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* MOBILKORT */}
      <div className="expense-list">
        {expenses.map(exp => (
          <div key={exp.id} className="expense-mobile-card">
            {editingId === exp.id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Datum</label>
                <input type="date" className="form-input" value={editDate} onChange={e => setEditDate(e.target.value)} />
                <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Beskrivning</label>
                <input type="text" className="form-input" value={editDescription} onChange={e => setEditDescription(e.target.value)} />
                <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Belopp</label>
                <input type="number" step="0.01" className="form-input" value={editAmount} onChange={e => setEditAmount(e.target.value)} />
                <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Kategori</label>
                <select className="form-input" value={editCategoryId} onChange={e => setEditCategoryId(parseInt(e.target.value))}>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: '12px', margin: '4px 0' }}>
                  <label style={{ fontSize: '0.8rem' }}>
                    <input type="checkbox" checked={editIsFixed} onChange={e => setEditIsFixed(e.target.checked)} /> 🔁 Fast
                  </label>
                  <label style={{ fontSize: '0.8rem' }}>
                    <input type="checkbox" checked={editIsPending} onChange={e => setEditIsPending(e.target.checked)} /> ⏳ Planerad
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button onClick={() => saveEdit(exp.id)} className="btn btn-primary" style={{ flex: 1, padding: '8px' }}>Spara</button>
                  <button onClick={cancelEdit} style={{ flex: 1, padding: '8px', background: '#94a3b8', color: '#fff', border: 'none', borderRadius: '4px' }}>Avbryt</button>
                </div>
              </div>
            ) : (
              <>
                <div className="expense-mobile-header">
                  <div>
                    <strong>{exp.description}</strong>
                    <div className="expense-mobile-meta">
                      <span>{new Date(exp.date).toLocaleDateString('sv-SE')}</span>
                      <span>•</span>
                      <span>{exp.category?.name || 'Okänd'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                      {exp.isFixed && (
                        <span style={{ fontSize: '0.65rem', padding: '1px 5px', background: '#e0f2fe', color: '#0369a1', borderRadius: '4px', fontWeight: 600 }}>
                          🔁 Fast
                        </span>
                      )}
                      {exp.isPending && (
                        <span style={{ fontSize: '0.65rem', padding: '1px 5px', background: '#fef3c7', color: '#b45309', borderRadius: '4px', fontWeight: 600 }}>
                          ⏳ Planerad
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>{exp.amount.toFixed(2)} kr</strong>
                  </div>
                </div>

                {exp.items && exp.items.length > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleExpand(exp.id)}
                    style={{
                      width: '100%',
                      marginTop: '8px',
                      padding: '6px',
                      background: '#f1f5f9',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      color: '#3b82f6',
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    {expandedExpenseId === exp.id ? 'Dölj kvitto ▲' : `Visa kvitto (${exp.items.length} varor) ▼`}
                  </button>
                )}

                {expandedExpenseId === exp.id && exp.items && exp.items.length > 0 && (
                  <div className="receipt-drawer">
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#475569' }}>Varor:</h4>
                    {exp.items.map((it, idx) => (
                      <div key={idx} className="receipt-item-row">
                        <span>{it.name}</span>
                        <span>
                          {it.discount > 0 && (
                            <span className="receipt-discount-tag">-{it.discount.toFixed(2)} kr</span>
                          )}
                          <strong>{it.finalPrice.toFixed(2)} kr</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button onClick={() => startEdit(exp)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', color: '#334155' }}>
                    Ändra
                  </button>
                  <button onClick={() => handleDelete(exp.id)} className="btn btn-delete" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                    Ta bort
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};