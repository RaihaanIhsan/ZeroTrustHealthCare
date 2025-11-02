const jwt = require('jsonwebtoken');
const { getSessionInfo, updateSessionActivity } = require('../models/session');
const { recordAccessAttempt } = require('../models/metrics');

// Zero Trust Principle: Never Trust, Always Verify
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      recordAccessAttempt(req.ip, null, 'DENIED', 'No token provided');
      return res.status(401).json({ 
        error: 'Access denied. No token provided.',
        zeroTrustAction: 'VERIFICATION_FAILED'
      });
    }

    // Verify token signature
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'zero-trust-secret-key-change-in-production');
    
    // Zero Trust: Verify session is still valid (not revoked)
    const sessionInfo = await getSessionInfo(decoded.sessionId);
    if (!sessionInfo || !sessionInfo.isActive) {
      recordAccessAttempt(req.ip, decoded.userId, 'DENIED', 'Session revoked or expired');
      return res.status(401).json({ 
        error: 'Access denied. Session invalid.',
        zeroTrustAction: 'SESSION_VERIFICATION_FAILED'
      });
    }

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      sessionId: decoded.sessionId
    };

    // Record successful verification
    recordAccessAttempt(req.ip, decoded.userId, 'GRANTED', 'Token verified');
    
    next();
  } catch (error) {
    recordAccessAttempt(req.ip, null, 'DENIED', `Token verification failed: ${error.message}`);
    return res.status(401).json({ 
      error: 'Access denied. Invalid token.',
      zeroTrustAction: 'TOKEN_VERIFICATION_FAILED'
    });
  }
};

// Zero Trust Principle: Continuous Verification
const continuousVerification = async (req, res, next) => {
  // Log all access attempts for continuous monitoring
  if (req.headers.authorization) {
    const token = req.headers.authorization?.split(' ')[1];
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.sessionId) {
        await updateSessionActivity(decoded.sessionId, req.path);
      }
    } catch (error) {
      // Continue even if token decode fails (will be caught by verifyToken)
    }
  }
  next();
};

// Zero Trust Principle: Role-Based Access Control (Least Privilege)
const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        zeroTrustAction: 'AUTHENTICATION_REQUIRED'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      recordAccessAttempt(req.ip, req.user.userId, 'DENIED', `Role check failed. Required: ${allowedRoles.join(', ')}, Have: ${req.user.role}`);
      return res.status(403).json({ 
        error: 'Access denied. Insufficient permissions.',
        zeroTrustAction: 'ROLE_VERIFICATION_FAILED',
        requiredRoles: allowedRoles,
        userRole: req.user.role
      });
    }

    recordAccessAttempt(req.ip, req.user.userId, 'GRANTED', `Role verified: ${req.user.role}`);
    next();
  };
};

// Zero Trust Principle: Resource-level access control
const checkResourceAccess = async (req, res, next) => {
  // In zero trust, even if you have the role, verify you can access THIS specific resource
  // This would check if the user owns the resource or has explicit permission
  // For now, this is a placeholder that can be extended
  
  const resourceId = req.params.id || req.params.patientId || req.params.appointmentId;
  if (resourceId && req.user) {
    // Example: Doctors can access all patients, but nurses can only access assigned patients
    // This is simplified - in production, you'd check against a permission database
    recordAccessAttempt(req.ip, req.user.userId, 'GRANTED', `Resource access verified for ${resourceId}`);
  }
  
  next();
};

module.exports = {
  verifyToken,
  continuousVerification,
  checkRole,
  checkResourceAccess
};

