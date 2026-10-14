import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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

// En palett med snygga färger för staplarna
const CATEGORY_COLORS = [
  '#3b82f6', // blå
  '#10b981', // grön
  '#f59e0b', // bärnsten / orange
  '#ec4899', // rosa
  '#8b5cf6', // lila
  '#06b6d4', // cyan
  '#ef4444', // röd
  '#64748b', // skiffergrå
];

export default function DashboardPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'thisMonth' | 'lastMonth' | 'all'>('thisMonth');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [expData, catData] = await Promise.all([
          api.expenses.getAll(),
          api.categories.getAll(),
        ]);
        setExpenses(expData || []);
        setCategories(catData || []);
      } catch (err) {
        console.error('Kunde inte läsa in data till dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const [coachAdvice, setCoachAdvice] = useState<string | null>(null);
    const [loadingCoach, setLoadingCoach] = useState(false);

    const fetchCoachAdvice = async () => {
    try {
        setLoadingCoach(true);
        const data = await api.insights.getCoachAdvice();
        setCoachAdvice(data.advice);
    } catch (err) {
        console.error(err);
    } finally {
        setLoadingCoach(false);
    }
    };

    useEffect(() => {
    fetchCoachAdvice();
    }, []);


  // Filtrera transaktioner utifrån vald period
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const filteredExpenses = expenses.filter(exp => {
    if (period === 'all') return true;

    const expDate = new Date(exp.date);
    if (period === 'thisMonth') {
      return (
        expDate.getFullYear() === currentYear &&
        expDate.getMonth() === currentMonth
      );
    }
    if (period === 'lastMonth') {
      const targetMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const targetYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return (
        expDate.getFullYear() === targetYear &&
        expDate.getMonth() === targetMonth
      );
    }
    return true;
  });

  // 1. Beräkna totalkostnad
  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  // 2. Beräkna dagsgenomsnitt
  let daysInPeriod = 1;
  if (period === 'thisMonth') {
    daysInPeriod = Math.max(1, now.getDate());
  } else if (period === 'lastMonth') {
    const lastMonthDays = new Date(currentYear, currentMonth, 0).getDate();
    daysInPeriod = lastMonthDays;
  } else {
    // För "all" tar vi spannet mellan äldsta och nyaste transaktion
    if (filteredExpenses.length > 0) {
      const timestamps = filteredExpenses.map(e => new Date(e.date).getTime());
      const minTime = Math.min(...timestamps);
      const maxTime = Math.max(...timestamps);
      const diffDays = Math.ceil((maxTime - minTime) / (1000 * 60 * 60 * 24));
      daysInPeriod = Math.max(1, diffDays);
    }
  }
  const avgPerDay = totalAmount / daysInPeriod;

  // 3. Gruppera kostnad per kategori
  const categoryMap = new Map<number, { name: string; sum: number }>();

  filteredExpenses.forEach(exp => {
    const catId = exp.categoryId || 0;
    const catName = exp.category?.name || categories.find(c => c.id === catId)?.name || 'Övrigt';

    if (!categoryMap.has(catId)) {
      categoryMap.set(catId, { name: catName, sum: 0 });
    }
    categoryMap.get(catId)!.sum += exp.amount;
  });

  const categoryBreakdown = Array.from(categoryMap.values()).sort(
    (a, b) => b.sum - a.sum
  );

  const topCategory = categoryBreakdown[0] || { name: 'Ingen', sum: 0 };

  if (loading) {
    return (
      <div className="view-container">
        <p style={{ padding: '2rem', color: '#64748b' }}>Laddar översikt...</p>
      </div>
    );
  }

  return (
    <div className="view-container">
      {/* HEADER & FILTER */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#0f172a' }}>
            Ekonomisk översikt
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            Sammanställning av dina utgifter och kategorier
          </p>
        </div>

        {/* Tidsfilter */}
        <div
          style={{
            display: 'inline-flex',
            background: '#e2e8f0',
            borderRadius: '8px',
            padding: '4px',
            gap: '4px',
          }}
        >
          <button
            type="button"
            onClick={() => setPeriod('thisMonth')}
            style={{
              border: 'none',
              padding: '6px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.85rem',
              background: period === 'thisMonth' ? '#fff' : 'transparent',
              color: period === 'thisMonth' ? '#0f172a' : '#64748b',
              boxShadow:
                period === 'thisMonth' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            Denna månad
          </button>
          <button
            type="button"
            onClick={() => setPeriod('lastMonth')}
            style={{
              border: 'none',
              padding: '6px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.85rem',
              background: period === 'lastMonth' ? '#fff' : 'transparent',
              color: period === 'lastMonth' ? '#0f172a' : '#64748b',
              boxShadow:
                period === 'lastMonth' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            Förra månaden
          </button>
          <button
            type="button"
            onClick={() => setPeriod('all')}
            style={{
              border: 'none',
              padding: '6px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.85rem',
              background: period === 'all' ? '#fff' : 'transparent',
              color: period === 'all' ? '#0f172a' : '#64748b',
              boxShadow:
                period === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            Totalt
          </button>
        </div>
      </div>
    
    {/* AI COACH / TÄNK PÅ DETTA */}
<div style={{
  background: 'linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)',
  border: '1px solid #bae6fd',
  borderRadius: '12px',
  padding: '1.25rem',
  marginBottom: '24px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
}}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
    <strong style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0369a1', fontSize: '1.05rem' }}>
      💡 Tänk på detta (AI Coach)
    </strong>
    <button 
      onClick={fetchCoachAdvice} 
      disabled={loadingCoach}
      style={{
        background: '#fff',
        border: '1px solid #cbd5e1',
        borderRadius: '6px',
        padding: '4px 10px',
        fontSize: '0.8rem',
        cursor: 'pointer',
        color: '#475569'
      }}
    >
      {loadingCoach ? 'Analyserar...' : '↻ Uppdatera'}
    </button>
  </div>

  <div style={{ color: '#1e293b', fontSize: '0.95rem', lineHeight: '1.6' }}>
    {loadingCoach && !coachAdvice ? (
      <p style={{ margin: 0, color: '#64748b' }}>AI-coachen analyserar dina utgifter och budgetar...</p>
    ) : (
      <div style={{ whiteSpace: 'pre-line' }}>
        {coachAdvice}
      </div>
    )}
  </div>
</div>

      {/* KPI-KORT */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div
          className="card"
          style={{
            margin: 0,
            padding: '20px',
            borderLeft: '4px solid #3b82f6',
          }}
        >
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>
            Totala utgifter
          </span>
          <div
            style={{
              fontSize: '1.75rem',
              fontWeight: 'bold',
              color: '#0f172a',
              marginTop: '6px',
            }}
          >
            {totalAmount.toLocaleString('sv-SE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            kr
          </div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            {filteredExpenses.length} st transaktioner
          </span>
        </div>

        <div
          className="card"
          style={{
            margin: 0,
            padding: '20px',
            borderLeft: '4px solid #10b981',
          }}
        >
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>
            Snitt per dag
          </span>
          <div
            style={{
              fontSize: '1.75rem',
              fontWeight: 'bold',
              color: '#0f172a',
              marginTop: '6px',
            }}
          >
            {avgPerDay.toLocaleString('sv-SE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            kr
          </div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            baserat på {daysInPeriod} dagar
          </span>
        </div>

        <div
          className="card"
          style={{
            margin: 0,
            padding: '20px',
            borderLeft: '4px solid #f59e0b',
          }}
        >
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>
            Största utgiftskategori
          </span>
          <div
            style={{
              fontSize: '1.4rem',
              fontWeight: 'bold',
              color: '#0f172a',
              marginTop: '6px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {topCategory.name}
          </div>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            {topCategory.sum > 0
              ? `${topCategory.sum.toLocaleString('sv-SE', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} kr (${((topCategory.sum / (totalAmount || 1)) * 100).toFixed(0)}%)`
              : 'Ingen data'}
          </span>
        </div>
      </div>

      {/* DETALJERAD VY: KATEGORIFÖRDELNING + SENASTE TRANSAKTIONER */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
        }}
      >
        {/* KATEGORIER */}
        <div className="card" style={{ margin: 0 }}>
          <h2 style={{ marginTop: 0, fontSize: '1.15rem', color: '#0f172a' }}>
            Utgifter per kategori
          </h2>

          {categoryBreakdown.length === 0 ? (
            <p style={{ color: '#64748b' }}>Inga utgifter i denna period.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {categoryBreakdown.map((item, index) => {
                const percent = totalAmount > 0 ? (item.sum / totalAmount) * 100 : 0;
                const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];

                return (
                  <div key={item.name}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        fontSize: '0.9rem',
                        marginBottom: '4px',
                      }}
                    >
                      <span style={{ fontWeight: 600, color: '#334155' }}>
                        {item.name}
                      </span>
                      <span>
                        <strong style={{ color: '#0f172a' }}>
                          {item.sum.toLocaleString('sv-SE', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          kr
                        </strong>{' '}
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                          ({percent.toFixed(1)}%)
                        </span>
                      </span>
                    </div>

                    {/* Progress-stapel */}
                    <div
                      style={{
                        background: '#f1f5f9',
                        height: '8px',
                        borderRadius: '4px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${percent}%`,
                          background: color,
                          height: '100%',
                          borderRadius: '4px',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SENASTE TRANSAKTIONER I PERIODEN */}
        <div className="card" style={{ margin: 0 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}
          >
            <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a' }}>
              Senaste utgifterna
            </h2>
            <Link
              to="/expenses"
              style={{
                fontSize: '0.85rem',
                color: '#3b82f6',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              Visa alla →
            </Link>
          </div>

          {filteredExpenses.length === 0 ? (
            <p style={{ color: '#64748b' }}>Inga transaktioner att visa.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredExpenses.slice(0, 5).map(exp => (
                <div
                  key={exp.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 10px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>
                      {exp.description}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {new Date(exp.date).toLocaleDateString('sv-SE')} •{' '}
                      {exp.category?.name || 'Övrigt'}
                    </div>
                  </div>
                  <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>
                    {exp.amount.toFixed(2)} kr
                  </strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}