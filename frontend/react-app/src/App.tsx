import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import BudgetManage from './BudgetManage';
import BudgetCreate from './BudgetCreate';
import ExpensePage from './pages/ExpensePage';
import ImportPage from './pages/ImportPages';
import './App.css';

function App() {
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
        </aside>

        {/* MAIN CONTENT AREA med "Parent Boxing" */}
        <main className="main-content">
          <div className="content-window">
            <Routes>
              <Route path="/" element={
                <div className="view-container"> {/* <- Lägg till denna wrapper */}
                  <div className="card">
                    <h1 style={{ marginTop: 0 }}>Välkommen!</h1>
                    <p style={{ color: '#64748b' }}>Här kommer din ekonomiska översikt.</p>
                  </div>
                </div>
              } />

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