import React, { useState, useEffect } from 'react';
import { getPatients, getAppointments } from '../services/api';
import TrustScoreWidget from './TrustScoreWidget';
import './Dashboard.css';

const Dashboard = ({ user }) => {
  const [stats, setStats] = useState({
    patients: 0,
    appointments: 0,
    todayAppointments: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [patientsData, appointmentsData] = await Promise.all([
          getPatients(),
          getAppointments()
        ]);

        const today = new Date().toISOString().split('T')[0];
        const todayApps = appointmentsData.appointments?.filter(
          apt => apt.date === today
        ) || [];

        setStats({
          patients: patientsData.count || 0,
          appointments: appointmentsData.count || 0,
          todayAppointments: todayApps.length
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      <TrustScoreWidget user={user} />
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>Total Patients</h3>
            <p className="stat-number">{stats.patients}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <h3>Total Appointments</h3>
            <p className="stat-number">{stats.appointments}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📆</div>
          <div className="stat-content">
            <h3>Today's Appointments</h3>
            <p className="stat-number">{stats.todayAppointments}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🔒</div>
          <div className="stat-content">
            <h3>Your Role</h3>
            <p className="stat-role">{user.role.toUpperCase()}</p>
          </div>
        </div>
      </div>

      <div className="zero-trust-info-card">
        <h2>🔒 Zero Trust Security Active</h2>
        <div className="zt-features">
          <div className="zt-feature">
            <strong>✓ Authentication:</strong> Token-based verification on every request
          </div>
          <div className="zt-feature">
            <strong>✓ Authorization:</strong> Role-based access control (RBAC)
          </div>
          <div className="zt-feature">
            <strong>✓ Session Management:</strong> Continuous verification and revocation capability
          </div>
          <div className="zt-feature">
            <strong>✓ Least Privilege:</strong> You only see data appropriate for your role ({user.role})
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

