import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TrustScoreWidget.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const TrustScoreWidget = ({ user }) => {
  const [trustData, setTrustData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchTrustScore();
    const interval = setInterval(fetchTrustScore, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [user]);

  const fetchTrustScore = async () => {
    try {
      const response = await axios.get(`${API_URL}/metrics/trust-score`);
      setTrustData(response.data);
      setError('');
    } catch (err) {
      setError('Unable to fetch trust score');
      console.error('Trust score fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="trust-widget loading">Loading trust score...</div>;
  }

  if (error || !trustData) {
    return null; // Silently fail
  }

  const { trustScore, action, factors } = trustData;
  
  // Determine color based on score
  const getScoreColor = (score) => {
    if (score >= 70) return '#2ecc71'; // Green
    if (score >= 50) return '#f39c12'; // Orange
    return '#e74c3c'; // Red
  };

  const getActionIcon = (action) => {
    if (action === 'ALLOW') return '✓';
    if (action === 'CHALLENGE') return '⚠';
    return '✗';
  };

  return (
    <div className={`trust-widget ${action.toLowerCase()}`}>
      <div 
        className="trust-header" 
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: 'pointer' }}
      >
        <div className="trust-indicator">
          <span className="trust-icon" style={{ color: getScoreColor(trustScore) }}>
            {getActionIcon(action)}
          </span>
          <div className="trust-info">
            <span className="trust-label">Trust Score</span>
            <span 
              className="trust-value" 
              style={{ color: getScoreColor(trustScore) }}
            >
              {trustScore}/100
            </span>
          </div>
        </div>
        <button className="expand-btn">
          {expanded ? '▼' : '▶'}
        </button>
      </div>

      {expanded && (
        <div className="trust-details">
          <div className="trust-status">
            <strong>Status:</strong> {action}
          </div>
          
          <div className="trust-factors">
            <h4>Score Breakdown:</h4>
            {Object.entries(factors).map(([name, value]) => (
              <div key={name} className="factor-row">
                <span className="factor-name">
                  {name.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <div className="factor-bar">
                  <div 
                    className="factor-fill" 
                    style={{ 
                      width: `${value}%`,
                      backgroundColor: getScoreColor(value)
                    }}
                  />
                </div>
                <span className="factor-value">{value}</span>
              </div>
            ))}
          </div>

          <button 
            className="refresh-btn" 
            onClick={(e) => {
              e.stopPropagation();
              fetchTrustScore();
            }}
          >
            🔄 Refresh
          </button>
        </div>
      )}
    </div>
  );
};

export default TrustScoreWidget;