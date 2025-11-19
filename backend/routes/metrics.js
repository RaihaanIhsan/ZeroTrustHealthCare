const express = require('express');
const router = express.Router();
const { checkRole } = require('../middleware/zeroTrust');
const { getZeroTrustMetrics } = require('../models/metrics');
const { calculateTrustScore, explainTrustScore } = require('../models/trustScore');
const { privatizeMetrics } = require('../models/differentialPrivacy');
const { getPrivacyMetrics } = require('../models/privacy');
const { getHEMetrics } = require('../models/homomorphic');
const { generatePerformanceReport } = require('../models/performanceMeasurement');

const ENABLE_DP = process.env.ENABLE_DIFFERENTIAL_PRIVACY === 'true';

// Zero Trust: Get metrics (only admins)
router.get('/', checkRole('admin'), (req, res) => {
  try {
    let metrics = getZeroTrustMetrics();
    
    // Apply differential privacy if enabled
    if (ENABLE_DP) {
      metrics = privatizeMetrics(metrics);
    }
    
    res.json({
      metrics,
      privacyMetrics: getPrivacyMetrics(),
      message: 'Zero Trust metrics retrieved successfully',
      zeroTrustAction: 'METRICS_ACCESS_GRANTED'
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to retrieve metrics',
      message: error.message
    });
  }
});

// Get current user's trust score
router.get('/trust-score', async (req, res) => {
  try {
    const trustParams = {
      userId: req.user.userId,
      sessionId: req.user.sessionId,
      role: req.user.role,
      department: req.user.department,
      currentDevice: {
        ip: req.ip,
        userAgent: req.get('user-agent') || 'unknown'
      },
      endpoint: req.path,
      timestamp: new Date()
    };

    const trustResult = await calculateTrustScore(trustParams);
    const explanation = explainTrustScore(trustResult);

    res.json({
      trustScore: trustResult.trustScore,
      action: trustResult.action,
      reason: trustResult.reason,
      factors: trustResult.factors,
      explanation,
      timestamp: new Date(trustResult.timestamp).toISOString(),
      zeroTrustAction: 'TRUST_SCORE_RETRIEVED'
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to calculate trust score',
      message: error.message
    });
  }
});

// NEW: Performance comparison endpoint
router.get('/performance', checkRole('admin'), (req, res) => {
  try {
    const report = generatePerformanceReport();
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate performance report' });
  }
});

// NEW: Privacy-specific metrics
router.get('/privacy', checkRole('admin'), (req, res) => {
  try {
    res.json({
      fieldEncryption: getPrivacyMetrics(),
      homomorphicEncryption: getHEMetrics()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get privacy metrics' });
  }
});

module.exports = router;

