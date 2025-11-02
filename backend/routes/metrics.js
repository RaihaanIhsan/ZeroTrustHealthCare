const express = require('express');
const router = express.Router();
const { checkRole } = require('../middleware/zeroTrust');
const { getZeroTrustMetrics } = require('../models/metrics');

// Zero Trust: Get metrics (only admins)
router.get('/', checkRole('admin'), (req, res) => {
  try {
    const metrics = getZeroTrustMetrics();
    
    res.json({
      metrics,
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

module.exports = router;

