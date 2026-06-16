import { useEffect, useState } from 'react';
import DashboardPage from './pages/DashboardPage';
import SalesHistoryPage from './pages/SalesHistoryPage';
import SalesPage from './pages/SalesPage';
import PurchasesPage from './pages/PurchasesPage';
import ExpensesPage from './pages/ExpensesPage';
import CategoriesPage from './pages/CategoriesPage';
import ProductManagementPage from './pages/ProductManagementPage';
import StockAdjustmentsPage from './pages/StockAdjustmentsPage';
import BarcodeScannerPage from './pages/BarcodeScannerPage';
import LoginPage from './pages/LoginPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import './styles.css';

type AppRoute = '/dashboard' | '/sales' | '/sales/history' | '/products' | '/categories' | '/purchases' | '/expenses' | '/stock-adjustments' | '/scanner' | '/login';

const normalizePath = (path: string): AppRoute => {
  if (path === '/sales') return '/sales';
  if (path === '/sales/history') return '/sales/history';
  if (path === '/products') return '/products';
  if (path === '/categories') return '/categories';
  if (path === '/purchases') return '/purchases';
  if (path === '/expenses') return '/expenses';
  if (path === '/stock-adjustments') return '/stock-adjustments';
  if (path === '/scanner') return '/scanner';
  if (path === '/login') return '/login';
  return '/dashboard';
};

function AppShell() {
  const [route, setRoute] = useState<AppRoute>(normalizePath(window.location.pathname));
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    const onPopState = () => setRoute(normalizePath(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = (nextRoute: AppRoute) => {
    if (nextRoute === route) return;
    window.history.pushState({}, '', nextRoute);
    setRoute(nextRoute);
    setMenuOpen(false); // Close menu on navigation
  };

  useEffect(() => {
    if (!loading && !user && route !== '/login') {
      window.history.replaceState({}, '', '/login');
      setRoute('/login');
    }
  }, [loading, user, route]);

  // If the user becomes authenticated while on the /login route,
  // move them to the dashboard so the main content appears.
  useEffect(() => {
    if (!loading && user && route === '/login') {
      window.history.replaceState({}, '', '/dashboard');
      setRoute('/dashboard');
    }
  }, [loading, user, route]);

  if (loading) {
    return <main className="app"><p>Loading...</p></main>;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <>
      <nav className="app-nav">
        <div className="nav-container">
          <div className="nav-header">
            <span className="nav-brand">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary)' }}>
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              Retail ERP
            </span>
          </div>

          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
            <button type="button" className={`btn ${route === '/dashboard' ? 'btn-primary' : 'btn-light'}`} onClick={() => navigate('/dashboard')}>
              Dashboard
            </button>
            <button type="button" className={`btn ${route === '/scanner' ? 'btn-primary' : 'btn-light'}`} onClick={() => navigate('/scanner')}>
              Scanner
            </button>
            <button type="button" className={`btn ${route === '/sales' ? 'btn-primary' : 'btn-light'}`} onClick={() => navigate('/sales')}>
              Sales
            </button>
            <button
              type="button"
              className={`btn ${route === '/sales/history' ? 'btn-primary' : 'btn-light'}`}
              onClick={() => navigate('/sales/history')}
            >
              History
            </button>
            {user.role === 'owner' && (
              <button type="button" className={`btn ${route === '/products' ? 'btn-primary' : 'btn-light'}`} onClick={() => navigate('/products')}>
                Products
              </button>
            )}
            {user.role === 'owner' && (
              <button type="button" className={`btn ${route === '/categories' ? 'btn-primary' : 'btn-light'}`} onClick={() => navigate('/categories')}>
                Categories
              </button>
            )}
            {user.role === 'owner' && (
              <button type="button" className={`btn ${route === '/purchases' ? 'btn-primary' : 'btn-light'}`} onClick={() => navigate('/purchases')}>
                Purchases
              </button>
            )}
            <button type="button" className={`btn ${route === '/expenses' ? 'btn-primary' : 'btn-light'}`} onClick={() => navigate('/expenses')}>
              Expenses
            </button>
            <button type="button" className={`btn ${route === '/stock-adjustments' ? 'btn-primary' : 'btn-light'}`} onClick={() => navigate('/stock-adjustments')}>
              Stock
            </button>
            
            <div className="nav-user">
              <span className="muted" style={{ fontSize: '0.875rem', fontWeight: 500 }}>{user.name}</span>
              <button type="button" className="btn btn-outline" onClick={logout} style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}>
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="app">
        {route === '/dashboard' && <DashboardPage />}
        {route === '/scanner' && <BarcodeScannerPage />}
        {route === '/sales' && <SalesPage />}
        {route === '/sales/history' && <SalesHistoryPage />}
        {route === '/products' && user.role === 'owner' && <ProductManagementPage />}
        {route === '/categories' && user.role === 'owner' && <CategoriesPage />}
        {route === '/purchases' && user.role === 'owner' && <PurchasesPage />}
        {route === '/expenses' && <ExpensesPage />}
        {route === '/stock-adjustments' && <StockAdjustmentsPage />}
      </main>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppShell />
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
