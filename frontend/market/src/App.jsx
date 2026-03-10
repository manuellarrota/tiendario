
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MarketplacePage from './pages/MarketplacePage';
import CustomerDashboard from './pages/CustomerDashboard';
import LegalPage from './pages/LegalPage';

function App() {
  return (
    <Router>
      <div>
        <Routes>
          <Route path="/" element={<MarketplacePage />} />
          <Route path="/dashboard" element={<CustomerDashboard />} />
          <Route path="/terms" element={<LegalPage type="terms" />} />
          <Route path="/privacy" element={<LegalPage type="privacy" />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
