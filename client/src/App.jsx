import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import FlightMapPage from './pages/FlightMapPage';
import PathMap from './pages/PathMap';
import SignupPage from './pages/SignupPage';
import FlightSunMapPage from './pages/FlightSunMapPage';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/flight-map" element={<FlightMapPage />} />

          <Route path="/path-map" element={<PathMap />} />
          <Route path="/sun-seat" element={<FlightSunMapPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;


