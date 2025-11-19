// Basic Authentication Middleware for Baseline Tier
// Simple token validation without Zero Trust features

const jwt = require('jsonwebtoken');

/**
 * Basic token verification - no session tracking, no continuous verification
 * Just validates JWT signature and expiry
 */
function basicAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Access denied. No token provided.',
        tier: 'baseline'
      });
    }

    // Verify token signature only (no session validation)
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'zero-trust-secret-key-change-in-production');
    
    // Attach minimal user info to request
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      department: decoded.department
    };

    next();
  } catch (error) {
    return res.status(401).json({ 
      error: 'Invalid or expired token.',
      tier: 'baseline'
    });
  }
}

/**
 * Basic role check - simple RBAC
 */
function checkRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access denied. Insufficient permissions.',
        requiredRole: allowedRoles,
        userRole: req.user.role
      });
    }

    next();
  };
}

module.exports = {
  basicAuth,
  checkRole
};
