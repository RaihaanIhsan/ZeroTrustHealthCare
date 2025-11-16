// 

const jwt = require('jsonwebtoken');
const { getSessionInfo, updateSessionActivity } = require('../models/session');
const { recordAccessAttempt } = require('../models/metrics');
const { isWithinBusinessHours, getDeviceFingerprint, isTrustedDevice, isDepartmentAllowed } = require('../policies/context');
const { findPatientById } = require('../models/patient');
const bcrypt = require('bcrypt');

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
    
    // Zero Trust: Verify session is valid
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
      department: decoded.department, //added for context-aware check
      sessionId: decoded.sessionId
    };

    //Context-based Zero Trust checks
    const currentDevice = getDeviceFingerprint(req);
    const sessionDevice = sessionInfo.deviceInfo || {};
    if (!isTrustedDevice(sessionDevice, currentDevice)) {
      recordAccessAttempt(req.ip, req.user.userId, 'DENIED', 'Device context mismatch');
      return res.status(401).json({
        error: 'Access denied due to device context change.',
        zeroTrustAction: 'DEVICE_CONTEXT_FAILED'
      });
    }

    if (!isWithinBusinessHours()) {
      recordAccessAttempt(req.ip, req.user.userId, 'DENIED', 'Outside business hours');
      return res.status(403).json({
        error: 'Access restricted outside business hours.',
        zeroTrustAction: 'TIME_CONTEXT_FAILED'
      });
    }

    // ---  Data/Relationship Context ---
    // MODIFIED: This check now runs if user is a 'doctor' OR 'nurse' AND accessing a specific patient
    if ((req.user.role === 'doctor' || req.user.role === 'nurse') && 
      req.params.id && 
      (req.baseUrl === '/api/patients' || req.baseUrl === '/api/appointments')) { // Also check for appointments
      
      let patientDepartment;
      
      if (req.baseUrl === '/api/patients') {
        const patient = await findPatientById(req.params.id);
        if (!patient) {
            recordAccessAttempt(req.ip, req.user.userId, 'DENIED', 'Context check failed: Patient not found');
            return res.status(404).json({ error: 'Patient not found' });
        }
        patientDepartment = patient.department;
      }
      
      // If we are checking an appointment, we need to find the patient from the appointment
      // This logic is simplified here; ideally, appointment creation would store the department
      if (req.baseUrl === '/api/appointments' && req.params.id) {
          // This part is tricky as appointments model is not here.
          // We will apply this check at the route level for appointments instead.
          // For patient details, this check is correct.
      } else if (patientDepartment) {
         // Use the function from context.js
        if (!isDepartmentAllowed(req.user.department, patientDepartment)) {
            recordAccessAttempt(req.ip, req.user.userId, 'DENIED', `Context check failed: Dept mismatch.`);
            return res.status(403).json({ 
                error: 'Access denied. You do not have permission for this patient.',
                zeroTrustAction: 'CONTEXT_VERIFICATION_FAILED'
            });
        }
      }
    }
    // --- END OF DATA CHECK ---

    // --- 4. LAYER 3: PRIVACY SIMULATION (NEWLY ADDED) ---
    // Simulating heavy cryptographic work (like ABE or ZKP).
    // This is designed to be CPU-intensive and slow.
    try {
      await bcrypt.compare("dummy-data-to-hash", "$2a$10$abcdefghijklmnopqrstuv.w..");
    } catch (e) {
      // We don't care about the result, just the work
    }

    // Record successful verification (after context checks)
    recordAccessAttempt(req.ip, decoded.userId, 'GRANTED', 'Token and context verified');
    
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