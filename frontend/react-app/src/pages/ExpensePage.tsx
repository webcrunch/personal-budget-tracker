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
        // 1. Tvätta bort ev. stjärnor eller specialtecken
        let cleanedStore = (parsed.store || '').replace(/[*_#~]/g, '').trim();

        // Rätta vanliga felstavningar för Malmborgs
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

        // 2. Matcha matkategorier
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
      
      // Återställ formulär
      setDescription('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setCategoryId(0);
      setReceiptItems([]);
      setPreviewUrl(null);

      loadData();
    } catch (err: any) {
      console.error('Kunde inte spara utgift:', err);
      // Fångar upp dubblettvarningen från backend (409 Conflict)
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

  const toggleExpand = (id: number) => {
    setExpandedExpenseId(expandedExpenseId === id ? null : id);
  };

  return (
    <div className="view-container">
      {/* 1. KORT: LÄGG TILL UTGIFT & KVITTO */}
      <div className="card">
        <h2>Ny utgift</h2>

        {/* Kvittouppladdning */}
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

        {/* Utgiftsformulär */}
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
                      <button onClick={() => handleDelete(exp.id)} className="btn btn-delete" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                        Ta bort
                      </button>
                    </td>
                  </tr>

                  {/* Utfällt kvitto i desktop */}
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

              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => handleDelete(exp.id)} className="btn btn-delete" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                  Ta bort
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExpensePage;