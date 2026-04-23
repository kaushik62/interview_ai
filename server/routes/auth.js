import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query, getOne } from '../db.js';
import { generateToken, authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res) => {
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

    const existing = await getOne('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userId = uuidv4();

    await query(
      'INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)',
      [userId, name, email.toLowerCase(), passwordHash]
    );

    await query(
      `INSERT INTO user_stats (user_id, total_sessions, completed_sessions, total_questions_answered, average_score, best_score, total_practice_time_seconds, streak_days) 
       VALUES (?, 0, 0, 0, 0, 0, 0, 0)`,
      [userId]
    );

    await query(
      `INSERT INTO user_points (user_id, total_points, current_streak, longest_streak, last_activity_date, total_daily_challenges_completed) 
       VALUES (?, 0, 0, 0, CURDATE(), 0)`,
      [userId]
    );

    const token = generateToken(userId);
    
    const user = await getOne(
      'SELECT id, name, email, avatar_url, created_at FROM users WHERE id = ?',
      [userId]
    );

    res.status(201).json({ token, user, message: 'Registration successful!' });
    
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await getOne('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password);
    
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user.id);

    const pointsExist = await getOne('SELECT user_id FROM user_points WHERE user_id = ?', [user.id]);
    if (!pointsExist) {
      await query(
        `INSERT INTO user_points (user_id, total_points, current_streak, longest_streak, last_activity_date, total_daily_challenges_completed) 
         VALUES (?, 0, 0, 0, CURDATE(), 0)`,
        [user.id]
      );
    }

    await query('UPDATE users SET updated_at = NOW() WHERE id = ?', [user.id]);

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
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const stats = await getOne('SELECT * FROM user_stats WHERE user_id = ?', [req.user.id]);
    const points = await getOne('SELECT * FROM user_points WHERE user_id = ?', [req.user.id]);
    
    const recentActivity = await query(
      `SELECT 
        (SELECT COUNT(*) FROM interview_sessions WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as recent_interviews,
        (SELECT COUNT(*) FROM mcq_sessions WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as recent_mcq`,
      [req.user.id, req.user.id]
    );
    
    const today = new Date().toISOString().split('T')[0];
    const todayChallenge = await getOne(
      'SELECT * FROM user_challenge_completions WHERE user_id = ? AND challenge_date = ?',
      [req.user.id, today]
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
      points: points || {
        total_points: 0,
        current_streak: 0,
        longest_streak: 0
      },
      recentActivity: recentActivity[0] || { recent_interviews: 0, recent_mcq: 0 },
      todayChallengeCompleted: !!todayChallenge
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
      return res.status(400).json({ error: 'At least one field is required' });
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
    
    await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    
    const updated = await getOne(
      'SELECT id, name, email, avatar_url, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    
    res.json({ user: updated, message: 'Profile updated successfully!' });
    
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
    
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);
    
    await query('UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?', [newPasswordHash, req.user.id]);
    
    res.json({ message: 'Password changed successfully!' });
    
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ error: 'Failed to change password: ' + err.message });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res) => {
  res.json({ message: 'Logged out successfully' });
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