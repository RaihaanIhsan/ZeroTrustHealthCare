const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const { findUserByUsername, verifyPassword } = require('../models/user');
const { createSession, revokeSession, getSessionInfo } = require('../models/session');
const { recordAuthentication, recordSessionCreated } = require('../models/metrics');

// Zero Trust: Login with multi-factor verification concept
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      recordAuthentication(null, 'LOGIN', false, 'Missing credentials');
      return res.status(400).json({ 
        error: 'Username and password required',
        zeroTrustAction: 'CREDENTIALS_MISSING'
      });
    }

    // Verify user exists
    const user = await findUserByUsername(username);
    if (!user) {
      recordAuthentication(null, 'LOGIN', false, 'User not found');
      return res.status(401).json({ 
        error: 'Invalid credentials',
        zeroTrustAction: 'USER_VERIFICATION_FAILED'
      });
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      recordAuthentication(user.id, 'LOGIN', false, 'Invalid password');
      return res.status(401).json({ 
        error: 'Invalid credentials',
        zeroTrustAction: 'PASSWORD_VERIFICATION_FAILED'
      });
    }

    // Zero Trust: Create session with device info
    const deviceInfo = {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date().toISOString()
    };
    
    const session = createSession(user.id, deviceInfo);
    recordSessionCreated();

    // Generate JWT token with session ID (Zero Trust: Token includes session for revocation)
    const token = jwt.sign(
      { 
        userId: user.id,
        username: user.username,
        role: user.role,
        sessionId: session.sessionId
      },
      process.env.JWT_SECRET || 'zero-trust-secret-key-change-in-production',
      { expiresIn: '24h' }
    );

    recordAuthentication(user.id, 'LOGIN', true, 'Login successful');
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        department: user.department
      },
      sessionId: session.sessionId,
      zeroTrustAction: 'AUTHENTICATION_SUCCESS'
    });
  } catch (error) {
    console.error('Login error:', error);
    recordAuthentication(null, 'LOGIN', false, `Error: ${error.message}`);
    res.status(500).json({ 
      error: 'Internal server error',
      zeroTrustAction: 'AUTHENTICATION_ERROR'
    });
  }
});

// Zero Trust: Logout and revoke session
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (token) {
      try {
        const decoded = jwt.decode(token);
        if (decoded && decoded.sessionId) {
          revokeSession(decoded.sessionId);
          recordAuthentication(decoded.userId, 'LOGOUT', true, 'Session revoked');
        }
      } catch (error) {
        // Token might be invalid, but still respond
      }
    }
    
    res.json({ 
      message: 'Logout successful',
      zeroTrustAction: 'SESSION_REVOKED'
    });
  } catch (error) {
    res.status(500).json({ error: 'Logout error' });
  }
});

// Verify token endpoint
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        valid: false,
        error: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'zero-trust-secret-key-change-in-production');
    
    // Zero Trust: Verify session is still valid
    if (decoded.sessionId) {
      const sessionInfo = await getSessionInfo(decoded.sessionId);
      if (!sessionInfo || !sessionInfo.isActive) {
        return res.status(401).json({ 
          valid: false,
          error: 'Session invalid or revoked'
        });
      }
    }
    
    res.json({
      valid: true,
      user: {
        id: decoded.userId,
        username: decoded.username,
        role: decoded.role
      }
    });
  } catch (error) {
    res.status(401).json({ 
      valid: false,
      error: 'Invalid token'
    });
  }
});

module.exports = router;

