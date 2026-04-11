// server/routes/auth.js
import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query, getOne } from '../db.js';
import { generateToken, authenticate } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if user exists
    const existing = await getOne('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    // Insert user
    await query(
      'INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)',
      [userId, name, email.toLowerCase(), passwordHash]
    );

    // Initialize user stats
    await query(
      `INSERT INTO user_stats (user_id, total_sessions, completed_sessions, total_questions_answered, average_score, best_score, total_practice_time_seconds, streak_days) 
       VALUES (?, 0, 0, 0, 0, 0, 0, 0)
       ON DUPLICATE KEY UPDATE user_id = user_id`,
      [userId]
    );

    // Generate token
    const token = generateToken(userId);
    
    // Get user data
    const user = await getOne(
      'SELECT id, name, email, avatar_url, created_at FROM users WHERE id = ?',
      [userId]
    );

    res.status(201).json({ 
      token, 
      user,
      message: 'Registration successful!'
    });
    
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

// POST /api/auth/login - FIXED VERSION
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Login attempt for email:', email);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Get user with password
    const user = await getOne('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    
    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('User found, verifying password...');

    // Check password
    const valid = await bcrypt.compare(password, user.password);
    
    if (!valid) {
      console.log('Invalid password for user:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('Password valid, generating token...');

    // Generate token
    const token = generateToken(user.id);

    // Update last login time
    try {
      await query('UPDATE users SET updated_at = NOW() WHERE id = ?', [user.id]);
    } catch (updateErr) {
      console.log('Could not update last login time:', updateErr.message);
    }

    // Return user data
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
      },
      message: 'Login successful!'
    });
    
  } catch (err) {
    console.error('Login error details:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const stats = await getOne('SELECT * FROM user_stats WHERE user_id = ?', [req.user.id]);
    
    const recentActivity = await query(
      `SELECT 
        (SELECT COUNT(*) FROM interview_sessions WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as recent_interviews,
        (SELECT COUNT(*) FROM mcq_sessions WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as recent_mcq`,
      [req.user.id, req.user.id]
    );
    
    res.json({ 
      user: req.user,
      stats: stats || {
        total_sessions: 0,
        completed_sessions: 0,
        total_questions_answered: 0,
        average_score: 0,
        best_score: 0,
        total_practice_time_seconds: 0,
        streak_days: 0
      },
      recentActivity: recentActivity[0] || { recent_interviews: 0, recent_mcq: 0 }
    });
    
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to fetch user data: ' + err.message });
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, avatar_url } = req.body;
    
    if (!name && !avatar_url) {
      return res.status(400).json({ error: 'At least one field (name or avatar_url) is required' });
    }

    const updates = [];
    const values = [];
    
    if (name) {
      updates.push('name = ?');
      values.push(name);
    }
    
    if (avatar_url) {
      updates.push('avatar_url = ?');
      values.push(avatar_url);
    }
    
    updates.push('updated_at = NOW()');
    values.push(req.user.id);
    
    await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    
    const updated = await getOne(
      'SELECT id, name, email, avatar_url, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    
    res.json({ 
      user: updated,
      message: 'Profile updated successfully!'
    });
    
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Profile update failed: ' + err.message });
  }
});

// PUT /api/auth/change-password
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    
    const user = await getOne('SELECT password FROM users WHERE id = ?', [req.user.id]);
    
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    
    await query('UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?', [newPasswordHash, req.user.id]);
    
    res.json({ message: 'Password changed successfully!' });
    
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ error: 'Failed to change password: ' + err.message });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// DELETE /api/auth/account
router.delete('/account', authenticate, async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'Password is required to delete account' });
    }
    
    const user = await getOne('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const valid = await bcrypt.compare(password, user.password);
    
    if (!valid) {
      return res.status(401).json({ error: 'Incorrect password' });
    }
    
    await query('DELETE FROM users WHERE id = ?', [req.user.id]);
    
    res.json({ message: 'Account deleted successfully' });
    
  } catch (err) {
    console.error('Account deletion error:', err);
    res.status(500).json({ error: 'Failed to delete account: ' + err.message });
  }
});

export default router;