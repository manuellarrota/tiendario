import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import LandingPage from './pages/LandingPage';
import RegisterPage from './pages/RegisterPage';
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
import AdminCompaniesPage from './pages/AdminCompaniesPage';
import AdminPaymentsPage from './pages/AdminPaymentsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminConfigPage from './pages/AdminConfigPage';
import SalesHistoryPage from './pages/SalesHistoryPage';
import DailyClosingPage from './pages/DailyClosingPage';


import OfflineAlert from './components/OfflineAlert';


function App() {
  return (
    <Router>
      <div className="app-container">
        <OfflineAlert />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<DashboardHome />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/suppliers" element={<SupplierPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/purchases/new" element={<NewPurchasePage />} />
          <Route path="/purchases/history" element={<PurchaseHistoryPage />} />
          <Route path="/pos" element={<POSPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/company" element={<CompanyPage />} />
          <Route path="/sales/history" element={<SalesHistoryPage />} />
          <Route path="/daily-closing" element={<DailyClosingPage />} />

          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/admin/companies" element={<AdminCompaniesPage />} />
          <Route path="/admin/payments" element={<AdminPaymentsPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/config" element={<AdminConfigPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
