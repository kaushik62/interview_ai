// Advanced rate limiter that tracks by user ID (not just IP)
const userRequests = new Map();

export const userRateLimiter = (maxRequests, windowMs) => {
  return async (req, res, next) => {
    // Use user ID if logged in, otherwise use IP
    const userId = req.user?.id || req.ip;
    const now = Date.now();
    
    if (!userRequests.has(userId)) {
      userRequests.set(userId, []);
    }
    
    const userRequestTimes = userRequests.get(userId);
    
    // Clean old requests
    const windowStart = now - windowMs;
    while (userRequestTimes.length > 0 && userRequestTimes[0] < windowStart) {
      userRequestTimes.shift();
    }
    
    // Check limit
    if (userRequestTimes.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: `Rate limit exceeded. Max ${maxRequests} requests per ${windowMs / 60000} minutes.`
      });
    }
    
    userRequestTimes.push(now);
    next();
  };
};