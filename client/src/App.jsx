import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import FlightMapPage from './pages/FlightMapPage';
import PathMap from './pages/PathMap';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<FlightMapPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/flight-map" element={<FlightMapPage />} />

          <Route path="/path-map" element={<PathMap />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;


