// Metrics for measuring Zero Trust impact
const accessAttempts = [];
const authenticationEvents = [];
const sessionMetrics = {
  totalSessions: 0,
  activeSessions: 0,
  revokedSessions: 0
};

const recordAccessAttempt = (ip, userId, result, reason) => {
  const attempt = {
    id: accessAttempts.length + 1,
    ip,
    userId: userId || 'anonymous',
    result, // GRANTED or DENIED
    reason,
    timestamp: new Date().toISOString()
  };
  
  accessAttempts.push(attempt);
  
  // Keep only last 10000 attempts
  if (accessAttempts.length > 10000) {
    accessAttempts.shift();
  }
  
  return attempt;
};

const recordAuthentication = (userId, method, success, reason) => {
  const event = {
    id: authenticationEvents.length + 1,
    userId,
    method, // 'LOGIN', 'LOGOUT', 'TOKEN_REFRESH'
    success,
    reason,
    timestamp: new Date().toISOString()
  };
  
  authenticationEvents.push(event);
  
  // Keep only last 5000 events
  if (authenticationEvents.length > 5000) {
    authenticationEvents.shift();
  }
  
  return event;
};

const recordSessionCreated = () => {
  sessionMetrics.totalSessions++;
  sessionMetrics.activeSessions++;
};

const recordSessionRevoked = () => {
  sessionMetrics.activeSessions--;
  sessionMetrics.revokedSessions++;
};

const getZeroTrustMetrics = () => {
  const now = new Date();
  const last24Hours = new Date(now - 24 * 60 * 60 * 1000);
  const lastHour = new Date(now - 60 * 60 * 1000);
  
  const recentAttempts = accessAttempts.filter(a => new Date(a.timestamp) >= last24Hours);
  const recentAuths = authenticationEvents.filter(a => new Date(a.timestamp) >= last24Hours);
  const hourlyAttempts = accessAttempts.filter(a => new Date(a.timestamp) >= lastHour);
  
  const deniedAttempts = recentAttempts.filter(a => a.result === 'DENIED');
  const grantedAttempts = recentAttempts.filter(a => a.result === 'GRANTED');
  
  const deniedRate = recentAttempts.length > 0 
    ? (deniedAttempts.length / recentAttempts.length * 100).toFixed(2)
    : 0;
  
  const successAuths = recentAuths.filter(a => a.success);
  const failedAuths = recentAuths.filter(a => !a.success);
  
  return {
    accessAttempts: {
      total: accessAttempts.length,
      last24Hours: recentAttempts.length,
      lastHour: hourlyAttempts.length,
      granted: grantedAttempts.length,
      denied: deniedAttempts.length,
      denialRate: `${deniedRate}%`,
      recentDenials: deniedAttempts.slice(-10).reverse()
    },
    authentication: {
      total: authenticationEvents.length,
      last24Hours: recentAuths.length,
      successful: successAuths.length,
      failed: failedAuths.length,
      recentEvents: recentAuths.slice(-10).reverse()
    },
    sessions: {
      ...sessionMetrics,
      activeSessions: sessionMetrics.activeSessions
    },
    zeroTrustEffectiveness: {
      verificationRate: `${((grantedAttempts.length / recentAttempts.length) * 100).toFixed(2)}%`,
      threatBlocked: deniedAttempts.length,
      securityScore: calculateSecurityScore(deniedRate, failedAuths.length, recentAttempts.length)
    },
    timestamp: now.toISOString()
  };
};

const calculateSecurityScore = (deniedRate, failedAuths, totalAttempts) => {
  // Score based on zero trust enforcement
  // Higher denied rate = more strict enforcement (could be good or bad)
  // More failed auths relative to attempts = better detection
  let score = 100;
  
  // Reduce score if denial rate is too high (might be too restrictive)
  if (deniedRate > 30) score -= 10;
  if (deniedRate > 50) score -= 10;
  
  // Increase score for detecting failed auths (good zero trust)
  const failureRate = totalAttempts > 0 ? (failedAuths / totalAttempts) * 100 : 0;
  if (failureRate > 5) score += 5;
  
  return Math.max(0, Math.min(100, score));
};

module.exports = {
  recordAccessAttempt,
  recordAuthentication,
  recordSessionCreated,
  recordSessionRevoked,
  getZeroTrustMetrics,
  accessAttempts,
  authenticationEvents
};

