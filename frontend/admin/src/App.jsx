import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

import LandingPage from './pages/LandingPage';
import DashboardHome from './pages/DashboardHome';
import InventoryPage from './pages/InventoryPage';
import SupplierPage from './pages/SupplierPage';
import NewPurchasePage from './pages/NewPurchasePage';
import PurchaseHistoryPage from './pages/PurchaseHistoryPage';
import CategoriesPage from './pages/CategoriesPage';
import CustomersPage from './pages/CustomersPage';
import POSPage from './pages/POSPage';
import ReportsPage from './pages/ReportsPage';
import CompanyPage from './pages/CompanyPage';
import NotificationsPage from './pages/NotificationsPage';
import SalesHistoryPage from './pages/SalesHistoryPage';
import DailyClosingPage from './pages/DailyClosingPage';

import AdminCompaniesPage from './pages/AdminCompaniesPage';
import AdminPaymentsPage from './pages/AdminPaymentsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminConfigPage from './pages/AdminConfigPage';
import AdminCatalogPage from './pages/AdminCatalogPage';
import AdminOnboardingPage from './pages/AdminOnboardingPage';
import AdminCategorySuggestionsPage from './pages/AdminCategorySuggestionsPage';

import RequireRole from './components/RequireRole';

// Shorthand guards
const Auth = ({ children }) => <RequireRole roles={['ROLE_MANAGER', 'ROLE_ADMIN']}>{children}</RequireRole>;
const AdminOnly = ({ children }) => <RequireRole roles={['ROLE_ADMIN']}>{children}</RequireRole>;
const ClientOnly = ({ children }) => <RequireRole roles={['ROLE_CLIENT']}>{children}</RequireRole>;

function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          {/* ── PUBLIC ─────────────────────────────────────── */}
          <Route path="/"      element={<LandingPage />} />


          {/* ── AUTHENTICATED (any logged-in manager/admin) ── */}
          <Route path="/dashboard"         element={<Auth><DashboardHome /></Auth>} />
          <Route path="/inventory"         element={<Auth><InventoryPage /></Auth>} />
          <Route path="/categories"        element={<Auth><CategoriesPage /></Auth>} />
          <Route path="/suppliers"         element={<Auth><SupplierPage /></Auth>} />
          <Route path="/customers"         element={<Auth><CustomersPage /></Auth>} />
          <Route path="/purchases/new"     element={<Auth><NewPurchasePage /></Auth>} />
          <Route path="/purchases/history" element={<Auth><PurchaseHistoryPage /></Auth>} />
          <Route path="/pos"               element={<Auth><POSPage /></Auth>} />
          <Route path="/reports"           element={<Auth><ReportsPage /></Auth>} />
          <Route path="/company"           element={<Auth><CompanyPage /></Auth>} />
          <Route path="/sales/history"     element={<Auth><SalesHistoryPage /></Auth>} />
          <Route path="/daily-closing"     element={<Auth><DailyClosingPage /></Auth>} />
          <Route path="/notifications"     element={<Auth><NotificationsPage /></Auth>} />

          {/* ── SUPER ADMIN ONLY ───────────────────────────── */}
          <Route path="/admin/companies"  element={<AdminOnly><AdminCompaniesPage /></AdminOnly>} />
          <Route path="/admin/payments"   element={<AdminOnly><AdminPaymentsPage /></AdminOnly>} />
          <Route path="/admin/users"      element={<AdminOnly><AdminUsersPage /></AdminOnly>} />
          <Route path="/admin/config"     element={<AdminOnly><AdminConfigPage /></AdminOnly>} />
          <Route path="/admin/catalog"    element={<AdminOnly><AdminCatalogPage /></AdminOnly>} />
          <Route path="/admin/categories" element={<AdminOnly><AdminCategorySuggestionsPage /></AdminOnly>} />
          <Route path="/admin/onboarding" element={<AdminOnly><AdminOnboardingPage /></AdminOnly>} />

          {/* ── CATCH-ALL ──────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
