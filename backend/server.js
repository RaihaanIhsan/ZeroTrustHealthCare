const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const appointmentRoutes = require('./routes/appointments');
const metricsRoutes = require('./routes/metrics');
const { verifyToken, continuousVerification, evaluateTrustScore } = require('./middleware/zeroTrust');

const app = express();
const PORT = process.env.PORT || 5000;

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

// Zero Trust: Continuous verification middleware
app.use('/api/', continuousVerification);

// Health check endpoint (public)
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Authentication routes (public)
app.use('/api/auth', authRoutes);

// Protected routes - Zero Trust: Verify + Trust Score Evaluation
app.use('/api/patients', verifyToken, evaluateTrustScore, patientRoutes);
app.use('/api/appointments', verifyToken, evaluateTrustScore, appointmentRoutes);
app.use('/api/metrics', verifyToken, evaluateTrustScore, metricsRoutes);

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
  console.log(`🔒 Zero Trust Architecture: Active`);
});

