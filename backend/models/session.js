const { v4: uuidv4 } = require('uuid');

// In-memory session store (in production, use Redis or database)
const sessions = new Map();

const createSession = (userId, deviceInfo = {}) => {
  const sessionId = uuidv4();
  const session = {
    sessionId,
    userId,
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    isActive: true,
    deviceInfo,
    accessLog: []
  };
  
  sessions.set(sessionId, session);
  return session;
};

const getSessionInfo = async (sessionId) => {
  // Simulate database latency for realistic benchmarking
  // In production, this would be actual DB query time
  if (process.env.ENABLE_ZERO_TRUST === 'true') {
    await new Promise(resolve => setTimeout(resolve, 5)); // 5ms DB lookup simulation
  }
  return sessions.get(sessionId) || null;
};

const revokeSession = (sessionId) => {
  const session = sessions.get(sessionId);
  if (session) {
    session.isActive = false;
    session.revokedAt = new Date().toISOString();
    return true;
  }
  return false;
};

const updateSessionActivity = (sessionId, endpoint) => {
  const session = sessions.get(sessionId);
  if (session) {
    session.lastActivity = new Date().toISOString();
    session.accessLog.push({
      endpoint,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 100 access logs
    if (session.accessLog.length > 100) {
      session.accessLog = session.accessLog.slice(-100);
    }
  }
};

const getAllActiveSessions = () => {
  return Array.from(sessions.values()).filter(s => s.isActive);
};

const revokeAllUserSessions = (userId) => {
  let revokedCount = 0;
  sessions.forEach((session, sessionId) => {
    if (session.userId === userId && session.isActive) {
      session.isActive = false;
      session.revokedAt = new Date().toISOString();
      revokedCount++;
    }
  });
  return revokedCount;
};

module.exports = {
  createSession,
  getSessionInfo,
  revokeSession,
  updateSessionActivity,
  getAllActiveSessions,
  revokeAllUserSessions,
  sessions
};

