import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import BudgetManage from './BudgetManage';
import BudgetCreate from './BudgetCreate';
import ExpensePage from './pages/ExpensePage';
import ImportPage from './pages/ImportPages';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import { AUTH_EXPIRED_EVENT, hasValidSession, logout } from './utils/auth';
import './App.css';

function App() {
  // Utan giltig session visas bara inloggningen; ett 401 från backend tar tillbaka hit
  const [loggedIn, setLoggedIn] = useState(hasValidSession());
  const [loginMessage, setLoginMessage] = useState('');

  useEffect(() => {
    const expired = () => {
      setLoginMessage('Sessionen har gått ut. Logga in igen.');
      setLoggedIn(false);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, expired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, expired);
  }, []);

  if (!loggedIn) {
    return <LoginPage message={loginMessage} onLogin={() => { setLoginMessage(''); setLoggedIn(true); }} />;
  }

  return (
    <Router>
      <div className="dashboard-layout">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sidebar-brand">Smart Budget</div>
          <nav className="sidebar-nav">
            <Link to="/" className="nav-item">Översikt</Link>
            <Link to="/expenses" className="nav-item">Utgifter</Link>
            <Link to="/budgets" className="nav-item">Budgetar</Link>
            <Link to="/import" className="nav-item">AI Import</Link>
          </nav>
          <button type="button" className="nav-item logout-btn" onClick={() => { logout(); setLoggedIn(false); }}>
            Logga ut
          </button>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="main-content">
          <div className="content-window">
            <Routes>
              {/* Nu renderar startsidan din DashboardPage direkt! */}
              <Route path="/" element={<DashboardPage />} />

              <Route path="/expenses" element={<ExpensePage />} />
              <Route path="/budgets" element={<BudgetManage />} />
              <Route path="/budgets/create" element={<BudgetCreate />} />
              <Route path="/import" element={<ImportPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
