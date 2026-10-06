import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';

interface Category {
  id: number;
  name: string;
}

interface ExpenseItem {
  id?: number;
  name: string;
  price: number;
  discount: number;
  finalPrice: number;
}

interface Expense {
  id: number;
  description: string;
  amount: number;
  date: string;
  categoryId: number;
  category?: Category;
  items?: ExpenseItem[];
}

const ExpensePage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Formulär-state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState<number>(0);
  
  // Kvitto-state
  const [receiptItems, setReceiptItems] = useState<ExpenseItem[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [expandedExpenseId, setExpandedExpenseId] = useState<number | null>(null);

  // Redigeringsläge (Inline edit)
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<number>(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [expData, catData] = await Promise.all([
        api.expenses.getAll(),
        api.categories.getAll()
      ]);
      setExpenses(expData || []);
      setCategories(catData || []);
    } catch (err) {
      console.error('Kunde inte läsa in data:', err);
    }
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreviewUrl(URL.createObjectURL(file));
    setIsScanning(true);

    try {
      const parsed = await api.expenses.uploadReceipt(file);

      if (parsed) {
        let cleanedStore = (parsed.store || '').replace(/[*_#~]/g, '').trim();

        if (/malmbo[r]?g[r]?s/i.test(cleanedStore) || /erikslust/i.test(cleanedStore)) {
          cleanedStore = 'ICA Malmborgs Erikslust';
        }

        if (cleanedStore) setDescription(cleanedStore);
        if (parsed.totalAmount) setAmount(parsed.totalAmount.toString());
        if (parsed.date) setDate(parsed.date.split('T')[0]);

        if (parsed.items && parsed.items.length > 0) {
          setReceiptItems(parsed.items);
        } else {
          setReceiptItems([]);
        }

        const storeLower = cleanedStore.toLowerCase();
        const groceryKeywords = [
          'ica', 'maxi', 'kvantum', 'malmborg', 'malmbogrs',
          'coop', 'willys', 'lidl', 'city gross', 'hemköp'
        ];
        const isGrocery = groceryKeywords.some(k => storeLower.includes(k));

        const matched = categories.find(c => {
          const catName = c.name.toLowerCase();
          if (isGrocery) {
            return catName === 'mat' || catName === 'livsmedel' || catName === 'dagligvaror';
          }
          return false;
        });

        setCategoryId(matched ? matched.id : 0);
      }
    } catch (err) {
      console.error('Kunde inte läsa av kvitto:', err);
      alert('Kunde inte läsa av kvittot automatiskt.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;

    try {
      const newExpense = {
        description,
        amount: parseFloat(amount),
        date: new Date(date).toISOString(),
        categoryId: categoryId === 0 ? 0 : categoryId,
        items: receiptItems.length > 0 ? receiptItems : undefined
      };

      await api.expenses.create(newExpense);
      
      setDescription('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setCategoryId(0);
      setReceiptItems([]);
      setPreviewUrl(null);

      loadData();
    } catch (err: any) {
      console.error('Kunde inte spara utgift:', err);
      const errorMsg = err.response?.data?.message || err.message || '';
      if (errorMsg.includes('finns redan registrerad')) {
        alert(errorMsg);
      } else {
        alert('Kunde inte spara utgiften: ' + (errorMsg || 'Okänt fel'));
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Är du säker på att du vill ta bort denna utgift?')) return;
    try {
      await api.expenses.delete(id);
      loadData();
    } catch (err) {
      console.error('Kunde inte ta bort:', err);
    }
  };

  // Starta redigering av en rad
  const startEdit = (exp: Expense) => {
    setEditingId(exp.id);
    setEditDate(exp.date.split('T')[0]);
    setEditDescription(exp.description);
    setEditAmount(exp.amount.toString());
    setEditCategoryId(exp.categoryId || (exp.category?.id ?? 0));
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  // Spara redigerad utgift (anropar PUT)
  const saveEdit = async (id: number) => {
    try {
      const original = expenses.find(e => e.id === id);
      const updatedExpense = {
        id,
        description: editDescription,
        amount: parseFloat(editAmount),
        date: new Date(editDate).toISOString(),
        categoryId: editCategoryId,
        items: original?.items
      };

      await api.expenses.update(id, updatedExpense);
      setEditingId(null);
      loadData();
    } catch (err: any) {
      console.error('Kunde inte uppdatera utgift:', err);
      alert('Kunde inte spara ändringarna.');
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedExpenseId(expandedExpenseId === id ? null : id);
  };

  return (
    <div className="view-container">
      {/* 1. KORT: LÄGG TILL UTGIFT & KVITTO */}
      <div className="card">
        <h2>Ny utgift</h2>

        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: '#475569' }}>
            📷 Ladda upp kvitto (bild)
          </label>
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleReceiptUpload} 
            disabled={isScanning}
          />
          {isScanning && <p style={{ color: '#3b82f6', marginTop: '0.5rem', fontWeight: 600 }}>🔍 Läser av kvittot med AI...</p>}

          {previewUrl && (
            <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <img src={previewUrl} alt="Förhandsgranskning" style={{ maxHeight: '120px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              {receiptItems.length > 0 && (
                <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                  <strong>Hittade artiklar ({receiptItems.length} st):</strong>
                  <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                    {receiptItems.slice(0, 3).map((item, idx) => (
                      <li key={idx}>{item.name} - {item.finalPrice} kr</li>
                    ))}
                    {receiptItems.length > 3 && <li>...och {receiptItems.length - 3} till</li>}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="expense-form-grid">
          <div className="form-group">
            <label>Vad?</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="t.ex. ICA Malmborgs Erikslust" 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label>Belopp (kr)</label>
            <input 
              type="number" 
              step="0.01" 
              className="form-input" 
              placeholder="0.00" 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label>Datum</label>
            <input 
              type="date" 
              className="form-input" 
              value={date} 
              onChange={e => setDate(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label>Kategori</label>
            <select 
              className="form-input" 
              value={categoryId} 
              onChange={e => setCategoryId(parseInt(e.target.value))}
            >
              <option value={0}>🤖 Låt AI gissa...</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn btn-primary">
            Spara
          </button>
        </form>
      </div>

      {/* 2. KORT: UTGIFTSLISTA */}
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
                      <td colSpan={5} style={{ background: '#f8fafc', padding: '1rem' }}>
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
    </div>
  );
};

export default ExpensePage;