const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const appointmentRoutes = require('./routes/appointments');
const metricsRoutes = require('./routes/metrics');
const { verifyToken, continuousVerification, contextAwareChecks, evaluateTrustScore } = require('./middleware/zeroTrust');
const { basicAuth } = require('./middleware/basicAuth');
const { trackPerformance } = require('./middleware/performanceTracking');

const app = express();
const PORT = process.env.PORT || 5000;

// Debug: Log environment variables
console.log('DEBUG - Environment variables:');
console.log('  ENABLE_ZERO_TRUST:', process.env.ENABLE_ZERO_TRUST);
console.log('  Type:', typeof process.env.ENABLE_ZERO_TRUST);
console.log('  Comparison result:', process.env.ENABLE_ZERO_TRUST === 'true');

// Security middleware - Zero Trust Principle: Defense in Depth
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Rate limiting - Zero Trust: Limit attack surface
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Zero Trust: Continuous verification middleware (conditionally applied)
if (process.env.ENABLE_ZERO_TRUST === 'true') {
  app.use('/api/', continuousVerification);
  console.log('🔒 Zero Trust continuous verification: ENABLED');
}

// Health check endpoint (public)
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Authentication routes (public)
app.use('/api/auth', authRoutes);

// Protected routes - build middleware stack based on tier
let protectionMiddleware = [];

if (process.env.ENABLE_ZERO_TRUST === 'true') {
  // Tier 2: Zero Trust - JWT + session + continuous verification
  protectionMiddleware.push(verifyToken);
  
  // Tier 3: Context-Aware - add optimization checks (device, business hours, dept filtering)
  // Note: This actually reduces overhead by filtering early and caching trust scores
  if (process.env.ENABLE_TRUST_SCORE === 'true') {
    protectionMiddleware.push(contextAwareChecks);  // Context checks with caching
    protectionMiddleware.push(evaluateTrustScore);  // Trust score with 15-min cache
  }
} else {
  // Tier 1: Baseline - simple JWT verification only
  protectionMiddleware.push(basicAuth);
}

app.use('/api/patients', trackPerformance('privacyPreserving'), ...protectionMiddleware, patientRoutes);
app.use('/api/appointments', trackPerformance('baseline'), ...protectionMiddleware, appointmentRoutes);
app.use('/api/metrics', trackPerformance('baseline'), ...protectionMiddleware, metricsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Zero Trust Healthcare Server running on port ${PORT}`);
  console.log(`🔒 Zero Trust Architecture: ${process.env.ENABLE_ZERO_TRUST === 'true' ? 'Active' : 'Disabled (Baseline)'}`);
  console.log(`\n📋 Current Configuration:`);
  console.log(`   Zero Trust Middleware: ${process.env.ENABLE_ZERO_TRUST === 'true' ? '✅ ON' : '❌ OFF'}`);
  console.log(`   Field Encryption: ${process.env.ENABLE_FIELD_ENCRYPTION === 'true' ? '✅ ON' : '❌ OFF'}`);
  console.log(`   Differential Privacy: ${process.env.ENABLE_DIFFERENTIAL_PRIVACY === 'true' ? '✅ ON' : '❌ OFF'}`);
  console.log(`   Homomorphic Encryption: ${process.env.ENABLE_HOMOMORPHIC_ENCRYPTION === 'true' ? '✅ ON' : '❌ OFF'}`);
  console.log(`   Trust Score: ${process.env.ENABLE_TRUST_SCORE === 'true' ? '✅ ON' : '❌ OFF'}\n`);
});

