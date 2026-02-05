import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MarketplacePage from './pages/MarketplacePage';
import Navbar from './components/Navbar';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CustomerDashboard from './pages/CustomerDashboard';

function App() {
  return (
    <Router>
      <div>
        <Routes>
          <Route path="/" element={<MarketplacePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<CustomerDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
