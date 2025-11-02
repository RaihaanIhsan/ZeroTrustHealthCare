import React, { useState } from 'react';
import { login } from '../services/auth';
import './Login.css';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(username, password);
      onLogin(data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🏥 Zero Trust Healthcare</h1>
          <p>Secure Authentication Required</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="alert alert-error">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Enter username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter password"
            />
          </div>

          <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
            {loading ? 'Verifying...' : '🔒 Login'}
          </button>
        </form>

        <div className="login-info">
          <h3>Demo Credentials:</h3>
          <ul>
            <li><strong>Admin:</strong> admin / admin123</li>
            <li><strong>Doctor:</strong> doctor1 / doctor123</li>
            <li><strong>Nurse:</strong> nurse1 / nurse123</li>
          </ul>
        </div>

        <div className="zero-trust-info">
          <h4>🔒 Zero Trust Security:</h4>
          <ul>
            <li>✓ Token-based authentication</li>
            <li>✓ Session management</li>
            <li>✓ Role-based access control</li>
            <li>✓ Continuous verification</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Login;

