import React, { useState, useEffect } from 'react';
import { getMetrics } from '../services/api';
import './Metrics.css';

const Metrics = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      const data = await getMetrics();
      setMetrics(data.metrics);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading metrics...</div>;
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  if (!metrics) {
    return <div>No metrics available</div>;
  }

  return (
    <div className="metrics">
      <h1>🔒 Zero Trust Security Metrics</h1>
      
      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Access Attempts (24h)</h3>
          <div className="metric-value">{metrics.accessAttempts.last24Hours}</div>
          <div className="metric-details">
            <span className="metric-success">✓ Granted: {metrics.accessAttempts.granted}</span>
            <span className="metric-denied">✗ Denied: {metrics.accessAttempts.denied}</span>
          </div>
          <div className="metric-rate">
            Denial Rate: <strong>{metrics.accessAttempts.denialRate}</strong>
          </div>
        </div>

        <div className="metric-card">
          <h3>Authentication Events (24h)</h3>
          <div className="metric-value">{metrics.authentication.last24Hours}</div>
          <div className="metric-details">
            <span className="metric-success">✓ Successful: {metrics.authentication.successful}</span>
            <span className="metric-denied">✗ Failed: {metrics.authentication.failed}</span>
          </div>
        </div>

        <div className="metric-card">
          <h3>Active Sessions</h3>
          <div className="metric-value">{metrics.sessions.activeSessions}</div>
          <div className="metric-details">
            <span>Total: {metrics.sessions.totalSessions}</span>
            <span>Revoked: {metrics.sessions.revokedSessions}</span>
          </div>
        </div>

        <div className="metric-card security-score">
          <h3>Security Score</h3>
          <div className="metric-value large">{metrics.zeroTrustEffectiveness.securityScore}</div>
          <div className="metric-details">
            <span>Verification Rate: {metrics.zeroTrustEffectiveness.verificationRate}</span>
            <span>Threats Blocked: {metrics.zeroTrustEffectiveness.threatBlocked}</span>
          </div>
        </div>
      </div>

      <div className="metrics-section">
        <h2>Recent Access Denials</h2>
        <div className="card">
          {metrics.accessAttempts.recentDenials.length === 0 ? (
            <p>No recent denials</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User ID</th>
                  <th>IP</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {metrics.accessAttempts.recentDenials.map((attempt) => (
                  <tr key={attempt.id}>
                    <td>{new Date(attempt.timestamp).toLocaleString()}</td>
                    <td>{attempt.userId || 'Anonymous'}</td>
                    <td>{attempt.ip}</td>
                    <td>{attempt.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="metrics-section">
        <h2>Recent Authentication Events</h2>
        <div className="card">
          {metrics.authentication.recentEvents.length === 0 ? (
            <p>No recent events</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User ID</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {metrics.authentication.recentEvents.map((event) => (
                  <tr key={event.id}>
                    <td>{new Date(event.timestamp).toLocaleString()}</td>
                    <td>{event.userId || 'N/A'}</td>
                    <td>{event.method}</td>
                    <td>
                      <span className={event.success ? 'status-success' : 'status-failed'}>
                        {event.success ? '✓ Success' : '✗ Failed'}
                      </span>
                    </td>
                    <td>{event.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="zero-trust-summary">
        <h2>Zero Trust Impact Summary</h2>
        <div className="summary-grid">
          <div className="summary-item">
            <strong>Total Verification Checks:</strong> {metrics.accessAttempts.total}
          </div>
          <div className="summary-item">
            <strong>Threat Detection Rate:</strong> {metrics.accessAttempts.denialRate}
          </div>
          <div className="summary-item">
            <strong>Session Security:</strong> {metrics.sessions.activeSessions} active sessions monitored
          </div>
          <div className="summary-item">
            <strong>Overall Security Score:</strong> {metrics.zeroTrustEffectiveness.securityScore}/100
          </div>
        </div>
      </div>
    </div>
  );
};

export default Metrics;

