// Trust Score Engine for Zero Trust Healthcare System
// Calculates dynamic trust scores 

const { getSessionInfo } = require('./session');
const { accessAttempts, authenticationEvents } = require('./metrics');

// Trust score thresholds
const THRESHOLDS = {
  ALLOW: 70,
  CHALLENGE: 50,
  DENY: 0
};

// Weight distribution for trust factors (must sum to 1.0)
const WEIGHTS = {
  SESSION_HEALTH: 0.25,
  AUTH_TRACK_RECORD: 0.20,
  DEVICE_CONSISTENCY: 0.15,
  ACCESS_PATTERN: 0.15,
  CONTEXT_COMPLIANCE: 0.15,
  ROLE_RISK: 0.10
};

// Cache for user trust history (TTL: 15 minutes)
const trustCache = new Map();
const CACHE_TTL = 15 * 60 * 1000;

/**
 * Calculate comprehensive trust score for a request
 * @param {Object} params - Request context
 * @returns {Object} Trust evaluation result
 */
async function calculateTrustScore(params) {
  const {
    userId,
    sessionId,
    role,
    department,
    currentDevice,
    endpoint,
    timestamp = new Date()
  } = params;

  // Get cached score if still valid
  const cached = getTrustCache(userId);
  if (cached && (timestamp - cached.timestamp) < CACHE_TTL) {
    return updateWithRealtimeFactors(cached, params);
  }

  // Calculate individual trust factors
  const sessionHealth = await calculateSessionHealth(sessionId, timestamp);
  const authTrackRecord = calculateAuthTrackRecord(userId);
  const deviceConsistency = await calculateDeviceConsistency(userId, sessionId, currentDevice);
  const accessPattern = calculateAccessPattern(userId, endpoint, timestamp);
  const contextCompliance = calculateContextCompliance(role, department, timestamp);
  const roleRisk = calculateRoleRisk(role);

  // Weighted trust score calculation
  const trustScore = Math.round(
    sessionHealth * WEIGHTS.SESSION_HEALTH +
    authTrackRecord * WEIGHTS.AUTH_TRACK_RECORD +
    deviceConsistency * WEIGHTS.DEVICE_CONSISTENCY +
    accessPattern * WEIGHTS.ACCESS_PATTERN +
    contextCompliance * WEIGHTS.CONTEXT_COMPLIANCE +
    roleRisk * WEIGHTS.ROLE_RISK
  );

  // Determine action based on threshold
  let action = 'DENY';
  let reason = 'Trust score below minimum threshold';
  
  if (trustScore >= THRESHOLDS.ALLOW) {
    action = 'ALLOW';
    reason = 'Trust score meets security requirements';
  } else if (trustScore >= THRESHOLDS.CHALLENGE) {
    action = 'CHALLENGE';
    reason = 'Trust score requires additional verification';
  }

  const result = {
    trustScore,
    action,
    reason,
    factors: {
      sessionHealth: Math.round(sessionHealth),
      authTrackRecord: Math.round(authTrackRecord),
      deviceConsistency: Math.round(deviceConsistency),
      accessPattern: Math.round(accessPattern),
      contextCompliance: Math.round(contextCompliance),
      roleRisk: Math.round(roleRisk)
    },
    timestamp: timestamp.getTime(),
    userId
  };

  // Cache the result
  setTrustCache(userId, result);

  return result;
}

/**
 * Factor 1: Session Health Score (0-100)
 * Evaluates session age, activity recency, and access patterns
 */
async function calculateSessionHealth(sessionId, timestamp) {
  const session = await getSessionInfo(sessionId);
  if (!session || !session.isActive) return 0;

  let score = 100;

  // Penalty for session age (older = less trust)
  const sessionAge = timestamp - new Date(session.createdAt);
  const hoursOld = sessionAge / (1000 * 60 * 60);
  if (hoursOld > 12) score -= 15;
  else if (hoursOld > 6) score -= 10;
  else if (hoursOld > 3) score -= 5;

  // Penalty for inactivity (stale sessions are risky)
  const lastActivity = new Date(session.lastActivity);
  const inactiveMinutes = (timestamp - lastActivity) / (1000 * 60);
  if (inactiveMinutes > 30) score -= 20;
  else if (inactiveMinutes > 15) score -= 10;
  else if (inactiveMinutes > 5) score -= 5;

  // Bonus for consistent activity pattern
  const accessLog = session.accessLog || [];
  if (accessLog.length > 5) {
    const recentAccess = accessLog.slice(-5);
    const avgInterval = calculateAvgInterval(recentAccess);
    if (avgInterval > 0 && avgInterval < 10 * 60 * 1000) {
      score += 10; // Consistent activity is good
    }
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Factor 2: Authentication Track Record (0-100)
 * Based on user's historical login success rate
 */
function calculateAuthTrackRecord(userId) {
  const userEvents = authenticationEvents.filter(e => e.userId === userId);
  if (userEvents.length === 0) return 50; // Neutral for new users

  const recentEvents = userEvents.slice(-20); // Last 20 events
  const successCount = recentEvents.filter(e => e.success).length;
  const successRate = successCount / recentEvents.length;

  let score = successRate * 100;

  // Penalty for recent failures
  const last5 = recentEvents.slice(-5);
  const recentFailures = last5.filter(e => !e.success).length;
  if (recentFailures >= 3) score -= 30;
  else if (recentFailures >= 2) score -= 15;

  return Math.max(0, Math.min(100, score));
}

/**
 * Factor 3: Device Consistency (0-100)
 * Checks if current device matches historical patterns
 */
async function calculateDeviceConsistency(userId, sessionId, currentDevice) {
  const session = await getSessionInfo(sessionId);
  if (!session || !session.deviceInfo) return 50; // Neutral if no history

  let score = 100;
  const sessionDevice = session.deviceInfo;

  // Check IP consistency (same subnet)
  const currentIP = (currentDevice.ip || '').split(':').pop();
  const sessionIP = (sessionDevice.ip || '').split(':').pop();
  if (currentIP && sessionIP) {
    const currentSubnet = currentIP.split('.').slice(0, 2).join('.');
    const sessionSubnet = sessionIP.split('.').slice(0, 2).join('.');
    if (currentSubnet !== sessionSubnet) score -= 25;
  }

  // Check User-Agent consistency
  const currentUA = (currentDevice.userAgent || '').split(' ')[0];
  const sessionUA = (sessionDevice.userAgent || '').split(' ')[0];
  if (currentUA !== sessionUA) score -= 20;

  // Bonus for long-term device recognition
  const sessionAge = Date.now() - new Date(session.createdAt);
  const daysOld = sessionAge / (1000 * 60 * 60 * 24);
  if (daysOld > 7 && score > 80) score += 10;

  return Math.max(0, Math.min(100, score));
}

/**
 * Factor 4: Access Pattern Analysis (0-100)
 * Detects anomalies in request patterns
 */
function calculateAccessPattern(userId, endpoint, timestamp) {
  const userAttempts = accessAttempts.filter(a => a.userId === userId);
  if (userAttempts.length < 5) return 80; // Not enough data, assume good

  let score = 100;

  // Check request frequency (detect burst attacks)
  const last5Min = timestamp - (5 * 60 * 1000);
  const recentRequests = userAttempts.filter(
    a => new Date(a.timestamp) > last5Min
  );
  
  if (recentRequests.length > 50) score -= 40; // Suspicious burst
  else if (recentRequests.length > 20) score -= 20;

  // Check for unusual endpoint access
  const userHistory = userAttempts.slice(-100);
  const endpointFreq = userHistory.filter(a => 
    a.reason && a.reason.includes(endpoint)
  ).length;
  
  if (endpointFreq === 0 && userHistory.length > 20) {
    score -= 15; // First time accessing this endpoint
  }

  // Check recent denial rate (suspicious behavior)
  const recent20 = userAttempts.slice(-20);
  const deniedCount = recent20.filter(a => a.result === 'DENIED').length;
  if (deniedCount > 5) score -= 30;
  else if (deniedCount > 2) score -= 15;

  return Math.max(0, Math.min(100, score));
}

/**
 * Factor 5: Context Compliance (0-100)
 * Checks if request aligns with expected context
 */
function calculateContextCompliance(role, department, timestamp) {
  let score = 100;

  // Business hours compliance
  const businessHours = (process.env.BUSINESS_HOURS || '08:00-23:50').split('-');
  const [start, end] = businessHours;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const minutesNow = timestamp.getHours() * 60 + timestamp.getMinutes();
  const minutesStart = sh * 60 + sm;
  const minutesEnd = eh * 60 + em;
  
  const isBusinessHours = minutesNow >= minutesStart && minutesNow <= minutesEnd;
  if (!isBusinessHours) score -= 20;

  // Department validation
  const validDepartments = ['Administration', 'Cardiology', 'Emergency', 'General', 'Neurology', 'Pediatrics'];
  if (!validDepartments.includes(department)) score -= 15;

  // Role consistency check
  const validRoles = ['admin', 'doctor', 'nurse'];
  if (!validRoles.includes(role)) score -= 30;

  return Math.max(0, Math.min(100, score));
}

/**
 * Factor 6: Role Risk Profile (0-100)
 * Higher privilege roles require more scrutiny
 */
function calculateRoleRisk(role) {
  const riskProfiles = {
    admin: 70,    // High privilege = moderate base trust (needs more checks)
    doctor: 85,   // Medium privilege = good base trust
    nurse: 90     // Lower privilege = high base trust
  };

  return riskProfiles[role] || 50;
}

/**
 * Utility: Calculate average time interval between accesses
 */
function calculateAvgInterval(accessLog) {
  if (accessLog.length < 2) return 0;
  
  const intervals = [];
  for (let i = 1; i < accessLog.length; i++) {
    const prev = new Date(accessLog[i - 1].timestamp);
    const curr = new Date(accessLog[i].timestamp);
    intervals.push(curr - prev);
  }
  
  return intervals.reduce((a, b) => a + b, 0) / intervals.length;
}

/**
 * Cache Management
 */
function getTrustCache(userId) {
  const cached = trustCache.get(userId);
  if (!cached) return null;
  
  // Check if expired
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    trustCache.delete(userId);
    return null;
  }
  
  return cached;
}

function setTrustCache(userId, result) {
  trustCache.set(userId, result);
  
  // Clean old cache entries (simple LRU)
  if (trustCache.size > 1000) {
    const firstKey = trustCache.keys().next().value;
    trustCache.delete(firstKey);
  }
}

/**
 * Update cached score with real-time factors
 */
function updateWithRealtimeFactors(cached, params) {
  // Quick recalculation of time-sensitive factors only
  const contextCompliance = calculateContextCompliance(
    params.role,
    params.department,
    params.timestamp
  );
  
  // Adjust cached score
  const adjustment = (contextCompliance - cached.factors.contextCompliance) * WEIGHTS.CONTEXT_COMPLIANCE;
  const newScore = Math.max(0, Math.min(100, cached.trustScore + adjustment));
  
  return {
    ...cached,
    trustScore: Math.round(newScore),
    factors: {
      ...cached.factors,
      contextCompliance: Math.round(contextCompliance)
    },
    cached: true
  };
}

/**
 * Get trust score explanation for debugging/logging
 */
function explainTrustScore(trustResult) {
  const { trustScore, factors, action } = trustResult;
  
  return {
    summary: `Trust Score: ${trustScore}/100 - Action: ${action}`,
    breakdown: Object.entries(factors).map(([name, value]) => ({
      factor: name,
      score: value,
      weight: WEIGHTS[name.toUpperCase().replace(/([A-Z])/g, '_$1').slice(1)] || 0,
      contribution: Math.round(value * (WEIGHTS[name.toUpperCase().replace(/([A-Z])/g, '_$1').slice(1)] || 0))
    })),
    thresholds: THRESHOLDS
  };
}

module.exports = {
  calculateTrustScore,
  explainTrustScore,
  THRESHOLDS
};