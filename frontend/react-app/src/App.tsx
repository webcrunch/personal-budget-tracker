import { useState, useEffect } from 'react';
import type { FormEvent, ChangeEvent } from 'react'; // KORRIGERAD: Använd 'import type' för FormEvent och ChangeEvent
import './App.css'; // Bevara standard styling om du vill

// Definiera TypeScript-gränssnitt för dina modeller
interface Category {
  id: number;
  name: string;
}

interface Expense {
  id: number;
  description: string;
  amount: number;
  date: string; // Datumet kommer som en sträng från API:et
  categoryId: number;
  category?: Category; // Valfri, eftersom den kan vara null/undefined innan den laddats
}

// Initialt state för en ny utgift
const initialNewExpenseState: Omit<Expense, 'id' | 'category'> = {
  description: '',
  amount: 0,
  date: new Date().toISOString().split('T')[0], // Standardvärde: dagens datum i YYYY-MM-DD
  categoryId: 0, // Bör uppdateras med ett faktiskt ID från kategorilistan
};

function App() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]); // Nytt state för kategorier
  const [newExpense, setNewExpense] = useState<Omit<Expense, 'id' | 'category'>>(initialNewExpenseState);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null); // State för den utgift som redigeras
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false); // För att hantera laddning vid POST/PUT/DELETE

  const API_BASE_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:5015/api';

  // Effekt för att hämta utgifter och kategorier vid komponentens mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Hämta utgifter
        const expensesResponse = await fetch(`${API_BASE_URL}/expenses`);
        if (!expensesResponse.ok) {
          throw new Error(`Kunde inte hämta utgifter: ${expensesResponse.statusText}`);
        }
        const expensesData: Expense[] = await expensesResponse.json();
        setExpenses(expensesData);

        // Hämta kategorier
        const categoriesResponse = await fetch(`${API_BASE_URL}/categories`);
        if (!categoriesResponse.ok) {
          throw new Error(`Kunde inte hämta kategorier: ${categoriesResponse.statusText}`);
        }
        const categoriesData: Category[] = await categoriesResponse.json();
        setCategories(categoriesData);

        // Sätt initial categoryId för nya utgifter om kategorier finns
        if (categoriesData.length > 0 && newExpense.categoryId === 0) {
          setNewExpense(prev => ({ ...prev, categoryId: categoriesData[0].id }));
        }

      } catch (err: any) {
        console.error("Fel vid hämtning av data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [API_BASE_URL]); // Beroendelista för useEffect

  // Hanterar ändringar i formulärfälten
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (editingExpense) {
      setEditingExpense(prev => {
        if (!prev) return null;
        return {
          ...prev,
          [name]: name === 'amount' || name === 'categoryId' ? Number(value) : value,
        };
      });
    } else {
      setNewExpense(prev => ({
        ...prev,
        [name]: name === 'amount' || name === 'categoryId' ? Number(value) : value,
      }));
    }
  };

  // Hanterar formulärinskick för att lägga till eller uppdatera utgift
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const expenseToSubmit = editingExpense || { ...newExpense, id: 0 }; // ID är 0 för POST, annars befintligt

    try {
      const url = editingExpense ? `${API_BASE_URL}/Expense/${editingExpense.id}` : `${API_BASE_URL}/Expense`;
      const method = editingExpense ? 'PUT' : 'POST';

      // Konvertera datum till ISO-format för backend
      const formattedDate = new Date(expenseToSubmit.date).toISOString();

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...expenseToSubmit,
          date: formattedDate // Skicka formaterat datum
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.title || `HTTP error! status: ${response.status}`);
      }

      // Efter lyckad POST/PUT, uppdatera listan
      const updatedExpense = await response.json(); // POST returnerar den nya, PUT returnerar 204 No Content
      if (method === 'POST') {
        setExpenses(prev => [...prev, updatedExpense]);
      } else {
        // För PUT, hämta om alla för att säkerställa att listan är synkroniserad
        await fetchExpenses(); // Hämta om hela listan efter PUT
      }

      setNewExpense(initialNewExpenseState); // Återställ formuläret
      setEditingExpense(null); // Avsluta redigering
    } catch (err: any) {
      console.error("Fel vid sparande av utgift:", err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Funktion för att trigga omladdning av utgifter (används efter PUT/DELETE)
  const fetchExpenses = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/expenses`);
      if (!response.ok) {
        throw new Error(`Kunde inte hämta utgifter: ${response.statusText}`);
      }
      const data: Expense[] = await response.json();
      setExpenses(data);
    } catch (err: any) {
      console.error("Fel vid omladdning av utgifter:", err);
      setError(err.message);
    }
  };

  // Hanterar klick på "Redigera"
  const handleEditClick = (expense: Expense) => {
    setEditingExpense({ ...expense });
    // Anpassa datumformatet för input[type="date"]
    setEditingExpense(prev => ({
      ...prev!,
      date: new Date(expense.date).toISOString().split('T')[0],
    }));
  };

  // Hanterar klick på "Avbryt redigering"
  const handleCancelEdit = () => {
    setEditingExpense(null);
    setNewExpense(initialNewExpenseState);
  };

  // Hanterar klick på "Radera"
  const handleDeleteExpense = async (id: number) => {
    if (!window.confirm("Är du säker på att du vill radera denna utgift?")) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/Expense/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Uppdatera state genom att filtrera bort den borttagna utgiften
      setExpenses(prev => prev.filter(expense => expense.id !== id));
    } catch (err: any) {
      console.error("Fel vid radering av utgift:", err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="App">
        <header className="App-header">
          <p>Laddar utgifter och kategorier...</p>
        </header>
      </div>
    );
  }

  if (error) {
    return (
      <div className="App">
        <header className="App-header">
          <p>Fel: {error}</p>
          <p>Kontrollera att din backend körs på `{API_BASE_URL}` och att den är korrekt konfigurerad för CORS.</p>
        </header>
      </div>
    );
  }

  const currentFormState = editingExpense || newExpense;

  return (
    <div className="App">
      <header className="App-header">
        <h1>Mina Utgifter</h1>

        {/* Formulär för att lägga till/redigera utgifter */}
        <div style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '20px', borderRadius: '8px', maxWidth: '500px', margin: '20px auto', backgroundColor: '#f9f9f9', color: '#333' }}>
          <h2>{editingExpense ? 'Redigera Utgift' : 'Lägg till Ny Utgift'}</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text"
              name="description"
              placeholder="Beskrivning"
              value={currentFormState.description}
              onChange={handleChange}
              required
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
            <input
              type="number"
              name="amount"
              placeholder="Belopp"
              value={currentFormState.amount}
              onChange={handleChange}
              required
              step="0.01"
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
            <input
              type="date"
              name="date"
              value={currentFormState.date}
              onChange={handleChange}
              required
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
            <select
              name="categoryId"
              value={currentFormState.categoryId}
              onChange={handleChange}
              required
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              <option value="">Välj Kategori</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <button type="submit" disabled={submitting} style={{ padding: '10px 15px', borderRadius: '4px', border: 'none', backgroundColor: '#007bff', color: 'white', cursor: submitting ? 'not-allowed' : 'pointer' }}>
              {submitting ? 'Sparar...' : (editingExpense ? 'Uppdatera Utgift' : 'Lägg till Utgift')}
            </button>
            {editingExpense && (
              <button type="button" onClick={handleCancelEdit} disabled={submitting} style={{ padding: '10px 15px', borderRadius: '4px', border: 'none', backgroundColor: '#dc3545', color: 'white', cursor: submitting ? 'not-allowed' : 'pointer', marginTop: '5px' }}>
                Avbryt Redigering
              </button>
            )}
          </form>
        </div>

        {/* Lista över utgifter */}
        <h2>Alla Utgifter</h2>
        {expenses.length === 0 ? (
          <p>Inga utgifter hittades. Lägg till en ovan!</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, width: '100%', maxWidth: '600px', margin: '0 auto' }}>
            {expenses.map(expense => (
              <li key={expense.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', padding: '10px 0', color: '#333' }}>
                <span>
                  {expense.date ? new Date(expense.date).toLocaleDateString() : 'Inget datum'} - {expense.description}: {expense.amount} SEK ({expense.category ? expense.category.name : 'Okategoriserad'})
                </span>
                <div>
                  <button onClick={() => handleEditClick(expense)} style={{ padding: '5px 10px', borderRadius: '4px', border: 'none', backgroundColor: '#ffc107', color: 'white', cursor: 'pointer', marginRight: '5px' }}>
                    Redigera
                  </button>
                  <button onClick={() => handleDeleteExpense(expense.id)} style={{ padding: '5px 10px', borderRadius: '4px', border: 'none', backgroundColor: '#dc3545', color: 'white', cursor: 'pointer' }}>
                    Radera
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </header>
    </div>
  );
}

export default App;
