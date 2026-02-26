import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MarketplacePage from './pages/MarketplacePage';
import CustomerDashboard from './pages/CustomerDashboard';
import LoginPage from './pages/LoginPage';

function App() {
  return (
    <Router>
      <div>
        <Routes>
          <Route path="/" element={<MarketplacePage />} />
          <Route path="/dashboard" element={<CustomerDashboard />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
