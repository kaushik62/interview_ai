import rateLimit from 'express-rate-limit';

// IP-BASED RATE LIMITING - Explicitly using req.ip
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.ip, // Explicitly use IP address
  message: { success: false, error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.ip, // Explicitly use IP address
  message: { success: false, error: 'Too many attempts.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

export const quizLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.ip, // Explicitly use IP address
  message: { success: false, error: 'Too many quiz submissions. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const aiLimiter = rateLimit({ // Quiz Generation
  windowMs: 60 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => req.ip, // Explicitly use IP address
  message: { success: false, error: 'Too many generation requests. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const dailyChallengeLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => req.ip, // Explicitly use IP address
  message: { success: false, error: 'Daily challenge limit reached. Try again tomorrow.' },
  standardHeaders: true,
  legacyHeaders: false,
});