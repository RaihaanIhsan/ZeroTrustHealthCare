import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import PatientManagement from './components/PatientManagement';
import AppointmentManagement from './components/AppointmentManagement';
import Metrics from './components/Metrics';
import { verifyToken } from './services/auth';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    // Check if user is already logged in (skip if user is already set)
    if (user) {
      return;
    }

    const token = localStorage.getItem('token');
    if (token) {
      verifyToken(token)
        .then(userData => {
          if (userData.valid && userData.user) {
            setUser(userData.user);
          } else {
            localStorage.removeItem('token');
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error('Token verification failed:', err);
          localStorage.removeItem('token');
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleLogin = (userData) => {
    setUser(userData);
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setActiveTab('dashboard');
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🏥 Zero Trust Healthcare System</h1>
        <div className="user-info">
          <span>Welcome, <strong>{user.username}</strong> ({user.role})</span>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      <nav className="tabs">
        <button 
          className={activeTab === 'dashboard' ? 'active' : ''} 
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button 
          className={activeTab === 'patients' ? 'active' : ''} 
          onClick={() => setActiveTab('patients')}
        >
          Patients
        </button>
        <button 
          className={activeTab === 'appointments' ? 'active' : ''} 
          onClick={() => setActiveTab('appointments')}
        >
          Appointments
        </button>
        {user.role === 'admin' && (
          <button 
            className={activeTab === 'metrics' ? 'active' : ''} 
            onClick={() => setActiveTab('metrics')}
          >
            Zero Trust Metrics
          </button>
        )}
      </nav>

      <main className="main-content">
        {activeTab === 'dashboard' && <Dashboard user={user} />}
        {activeTab === 'patients' && <PatientManagement user={user} />}
        {activeTab === 'appointments' && <AppointmentManagement user={user} />}
        {activeTab === 'metrics' && user.role === 'admin' && <Metrics />}
      </main>
    </div>
  );
}

export default App;

