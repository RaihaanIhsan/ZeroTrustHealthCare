const { recordPerformance } = require('../models/performanceMeasurement');

function trackPerformance(tier) {
  return (req, res, next) => {
    const startTime = Date.now();
    
    // Capture response
    const originalSend = res.send;
    res.send = function(data) {
      const duration = Date.now() - startTime;
      
      recordPerformance(tier, duration, {
        endpoint: req.path,
        method: req.method,
        statusCode: res.statusCode,
        userId: req.user?.userId
      });
      
      originalSend.call(this, data);
    };
    
    next();
  };
}

module.exports = { trackPerformance };