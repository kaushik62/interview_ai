// server/middleware/auth.js
import jwt from 'jsonwebtoken';
import { getOne } from '../db.js';

// Get JWT secret with validation
const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('⚠️ WARNING: JWT_SECRET is not set in environment variables');
    console.error('Using fallback secret for development only!');
    return 'your-super-secret-key-change-this-in-production';
  }
  return secret;
};

const JWT_SECRET = getJWTSecret();

export const generateToken = (userId) => {
  try {
    console.log('Generating token for user:', userId);
    const token = jwt.sign({ userId }, JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
    console.log('Token generated successfully');
    return token;
  } catch (error) {
    console.error('Token generation error:', error.message);
    throw new Error('Failed to generate token');
  }
};

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    console.log('Auth header present:', authHeader ? 'Yes' : 'No');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No valid token provided');
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    console.log('Token received, length:', token?.length);
    
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      console.log('Token verified for user:', decoded.userId);
    } catch (verifyError) {
      console.error('Token verification failed:', verifyError.message);
      if (verifyError.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(401).json({ error: 'Invalid token' });
    }

    console.log('Fetching user from database:', decoded.userId);
    
    const user = await getOne(
      'SELECT id, name, email, avatar_url, created_at FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!user) {
      console.log('User not found in database:', decoded.userId);
      return res.status(401).json({ error: 'User not found' });
    }

    console.log('User authenticated:', user.email);
    req.user = user;
    next();
    
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    console.error('Error stack:', err.stack);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};