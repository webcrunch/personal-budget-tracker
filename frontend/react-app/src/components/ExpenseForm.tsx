import React, { useState } from 'react';
import { api } from '../utils/api';
import type { Category, ExpenseItem } from '../types';

interface ExpenseFormProps {
  categories: Category[];
  onExpenseAdded: () => Promise<void>;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ categories, onExpenseAdded }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState<number>(0);
  const [isFixed, setIsFixed] = useState<boolean>(false);
  const [isPending, setIsPending] = useState<boolean>(false);

  // Kvitto-state
  const [receiptItems, setReceiptItems] = useState<ExpenseItem[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

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

        // Sätt flaggor från AI om det är en avi/faktura
        if (parsed.isFixed !== undefined) setIsFixed(parsed.isFixed);
        if (parsed.isPending !== undefined) setIsPending(parsed.isPending);

        const storeLower = cleanedStore.toLowerCase();

        // 1. Identifiera och koppla artiklar samt deras kategori
        if (parsed.items && parsed.items.length > 0) {
          const stopWords = ['att betala', 'kort', 'kontant', 'totalt', 'summa', 'moms', 'subtotal', 'avrundning', 'kört', 'mastercard', 'visa'];
          const cleanItems = parsed.items
            .filter((item: any) => {
              const nameLower = (item.name || '').toLowerCase().trim();
              const containsStopWord = stopWords.some(w => nameLower.includes(w));
              const isIdenticalToTotal = parsed.items.length > 1 && item.finalPrice === parsed.totalAmount;
              return !(containsStopWord || isIdenticalToTotal);
            })
            .map((item: any) => {
              let matchedCatId: number | null = null;
              if (item.suggestedCategory) {
                const found = categories.find(c => c.name.toLowerCase() === item.suggestedCategory.toLowerCase());
                if (found) matchedCatId = found.id;
              } else if (/el|imd/i.test(item.name)) {
                const elCat = categories.find(c => /el|värme/i.test(c.name));
                if (elCat) matchedCatId = elCat.id;
              } else if (/hyra|årsavgift|bostad/i.test(item.name)) {
                const rentCat = categories.find(c => /boende/i.test(c.name));
                if (rentCat) matchedCatId = rentCat.id;
              }
              return {
                name: item.name,
                price: item.price,
                discount: item.discount || 0,
                finalPrice: item.finalPrice,
                categoryId: matchedCatId
              };
            });

          setReceiptItems(cleanItems);
        } else {
          setReceiptItems([]);
        }

        // 2. Matcha huvudkategori
        if (/a-kassa|akassa/i.test(storeLower)) {
          const insMatch = categories.find(c => /försäkring|abonnemang/i.test(c.name));
          setCategoryId(insMatch ? insMatch.id : 0);
          setIsFixed(true);
          setIsPending(true);
        } else if (/brf|månadsavi|hyresavi/i.test(storeLower)) {
          const rentMatch = categories.find(c => /boende/i.test(c.name));
          setCategoryId(rentMatch ? rentMatch.id : 0);
          setIsFixed(true);
          setIsPending(true);
        } else {
          const groceryKeywords = ['ica', 'maxi', 'kvantum', 'malmborg', 'malmbogrs', 'coop', 'willys', 'lidl', 'city gross', 'hemköp'];
          const isGrocery = groceryKeywords.some(k => storeLower.includes(k));

          const matched = categories.find(c => {
            const catName = c.name.toLowerCase();
            return isGrocery && (catName === 'mat' || catName === 'livsmedel' || catName === 'dagligvaror');
          });

          setCategoryId(matched ? matched.id : 0);
        }
      }
    } catch (err) {
      console.error('Kunde inte läsa av kvitto:', err);
      alert('Kunde inte läsa av kvittot automatiskt.');
    } finally {
      setIsScanning(false);
      e.target.value = '';
    }
  };

  const handleItemCategoryChange = (index: number, newCatId: number) => {
    const updated = [...receiptItems];
    updated[index].categoryId = newCatId === 0 ? null : newCatId;
    setReceiptItems(updated);
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
        isFixed,
        isPending,
        items: receiptItems.length > 0 ? receiptItems : undefined
      };

      await api.expenses.create(newExpense);

      setDescription('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setCategoryId(0);
      setIsFixed(false);
      setIsPending(false);
      setReceiptItems([]);
      setPreviewUrl(null);

      await onExpenseAdded();
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

  return (
    <div className="card">
      <h2>Ny utgift</h2>

      {/* Kvittouppladdning */}
      <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.75rem', color: '#475569' }}>
          🧾 Läs in kvitto eller avi
        </label>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <label 
            className="btn btn-primary" 
            style={{ 
              flex: '1 1 140px', 
              textAlign: 'center', 
              cursor: isScanning ? 'not-allowed' : 'pointer',
              opacity: isScanning ? 0.6 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            📸 Ta foto
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              style={{ display: 'none' }}
              onChange={handleReceiptUpload} 
              disabled={isScanning}
            />
          </label>

          <label 
            className="btn" 
            style={{ 
              flex: '1 1 140px', 
              textAlign: 'center', 
              cursor: isScanning ? 'not-allowed' : 'pointer',
              opacity: isScanning ? 0.6 : 1,
              background: '#e2e8f0', 
              color: '#1e293b',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            📁 Välj bild
            <input 
              type="file" 
              accept="image/*" 
              style={{ display: 'none' }}
              onChange={handleReceiptUpload} 
              disabled={isScanning}
            />
          </label>
        </div>

        {isScanning && (
          <p style={{ color: '#3b82f6', marginTop: '0.75rem', fontWeight: 600 }}>
            🔍 Läser av kvittot/avin med AI...
          </p>
        )}

        {previewUrl && (
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <img 
              src={previewUrl} 
              alt="Förhandsgranskning" 
              style={{ maxHeight: '120px', borderRadius: '6px', border: '1px solid #cbd5e1' }} 
            />
            {receiptItems.length > 0 && (
              <div style={{ fontSize: '0.85rem', color: '#475569', flex: 1 }}>
                <strong>Hittade artiklar ({receiptItems.length} st):</strong>
                <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {receiptItems.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', background: '#fff', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                      <span style={{ flex: 1 }}>{item.name}</span>
                      <strong style={{ minWidth: '70px', textAlign: 'right' }}>{item.finalPrice.toFixed(2)} kr</strong>
                      <select 
                        value={item.categoryId || 0}
                        onChange={(e) => handleItemCategoryChange(idx, parseInt(e.target.value))}
                        style={{ padding: '2px 4px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      >
                        <option value={0}>(Huvudkategori)</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Flaggor för Fast utgift & Kommande avi */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '1.25rem', padding: '0.75rem 1rem', background: '#f1f5f9', borderRadius: '8px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500, color: '#1e293b' }}>
          <input 
            type="checkbox" 
            checked={isFixed} 
            onChange={e => setIsFixed(e.target.checked)}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <span>🔁 Fast / Återkommande utgift</span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500, color: '#1e293b' }}>
          <input 
            type="checkbox" 
            checked={isPending} 
            onChange={e => setIsPending(e.target.checked)}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <span>⏳ Kommande avi (ej dragen ännu)</span>
        </label>
      </div>

      {/* Utgiftsformulär */}
      <form onSubmit={handleSubmit} className="expense-form-grid">
        <div className="form-group">
          <label>Vad?</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="t.ex. Akademikernas a-kassa eller ICA" 
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
              <option key={c.id} value={c.id}>
                {c.name} {c.isFixed ? '(Fast)' : ''}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="btn btn-primary">
          Spara
        </button>
      </form>
    </div>
  );
};