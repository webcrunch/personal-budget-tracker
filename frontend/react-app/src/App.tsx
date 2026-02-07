import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import BudgetManage from './BudgetManage';
import BudgetCreate from './BudgetCreate';
import ExpensePage from './pages/ExpensePage'; // Din nya fina fil
import ImportPage from './pages/ImportPages';
import './App.css';

// --- HUVUDKOMPONENT: APP ---
function App() {
  return (
    <Router>
      <div className="dashboard-layout">
        {/* Sidebaren behåller vi här tills vidare */}
        <aside className="sidebar">
          <div className="sidebar-brand">Smart Budget</div>
          <nav className="sidebar-nav">
            <Link to="/" className="nav-item">Översikt</Link>
            <Link to="/expenses" className="nav-item">Utgifter</Link>
            <Link to="/budgets" className="nav-item">Budgetar</Link>
            <Link to="/import" className="nav-item">AI Import</Link>
          </nav>
        </aside>

        <main className="main-content">
          <Routes>
            {/* Startsidan */}
            <Route path="/" element={
              <div className="card">
                <h1>Välkommen!</h1>
                <p>Här kommer din ekonomiska översikt.</p>
              </div>
            } />

            {/* Utgifter - Nu använder vi den utbrutna komponenten */}
            <Route path="/expenses" element={<ExpensePage />} />

            {/* Budgetar */}
            <Route path="/budgets" element={<BudgetManage />} />
            <Route path="/budgets/create" element={<BudgetCreate />} />

            {/* Import - Här kan vi skapa en ImportPage senare */}
            <Route path="/import" element={<ImportPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;