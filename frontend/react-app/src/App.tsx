import { useState, useEffect } from 'react';
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

function App() {
  const [expenses, setExpenses] = useState<Expense[]>([]); // Ange typ för state
  const [error, setError] = useState<string | null>(null); // Ange typ för state
  const [loading, setLoading] = useState<boolean>(true); // Ange typ för state

  // Hämta API-URL från miljövariabeln
  // Vite använder import.meta.env.VITE_VAR_NAME för miljövariabler
  const API_BASE_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        setLoading(true);
        // Använd den konstruerade URL:en för att hämta utgifter
        const response = await fetch(`${API_BASE_URL}/expenses`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: Expense[] = await response.json(); // Ange förväntad returtyp
        setExpenses(data);
      } catch (error: any) { // Använd 'any' för att hantera okända feltyper
        console.error("Kunde inte hämta utgifter:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchExpenses();
  }, [API_BASE_URL]); // Lägg till API_BASE_URL i beroendelistan om det kan ändras (bra praxis)

  if (loading) {
    return (
      <div className="App">
        <header className="App-header">
          <p>Laddar utgifter...</p>
        </header>
      </div>
    );
  }

  if (error) {
    return (
      <div className="App">
        <header className="App-header">
          <p>Fel: {error}. Kontrollera att din backend körs på {API_BASE_URL}.</p>
        </header>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Mina Utgifter</h1>
        {expenses.length === 0 ? (
          <p>Inga utgifter hittades. Lägg till några via din backend-API.</p>
        ) : (
          <ul>
            {expenses.map(expense => (
              <li key={expense.id}>
                {expense.date ? new Date(expense.date).toLocaleDateString() : 'Inget datum'} - {expense.description}: {expense.amount} SEK ({expense.category ? expense.category.name : 'Okategoriserad'})
              </li>
            ))}
          </ul>
        )}
      </header>
    </div>
  );
}

export default App;