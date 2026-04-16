// server/routes/stats.js - FIXED VERSION with Points Integration
import express from 'express';
import { query, getOne } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET /api/stats/dashboard - Get user statistics dashboard
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    // Ensure stats row exists for this user
    await query(
      `INSERT INTO user_stats (user_id, total_sessions, completed_sessions, total_questions_answered, average_score, best_score, total_practice_time_seconds, streak_days)
       VALUES (?, 0, 0, 0, 0, 0, 0, 0)
       ON DUPLICATE KEY UPDATE user_id = user_id`,
      [req.user.id]
    );

    // Get user stats
    const stats = await getOne(
      'SELECT * FROM user_stats WHERE user_id = ?',
      [req.user.id]
    );

    // Get points stats from user_points table
    const pointsStats = await getOne(
      `SELECT total_points, current_streak, longest_streak, last_activity_date
       FROM user_points 
       WHERE user_id = ?`,
      [req.user.id]
    );

    // Get recent interview sessions (last 5)
    const recentSessions = await query(
      `SELECT id, title, job_role, interview_type, status, overall_score, 
              answered_questions, total_questions, created_at, completed_at
       FROM interview_sessions
       WHERE user_id = ? AND status = 'completed'
       ORDER BY created_at DESC
       LIMIT 5`,
      [req.user.id]
    );

    // Get recent MCQ sessions (last 5)
    const recentMCQSessions = await query(
      `SELECT id, job_role, topic, status, score, total_questions, correct_count,
              created_at, completed_at
       FROM mcq_sessions
       WHERE user_id = ? AND status = 'completed'
       ORDER BY created_at DESC
       LIMIT 5`,
      [req.user.id]
    );

    // Get score history for charts (interview sessions)
    const scoreHistory = await query(
      `SELECT overall_score, completed_at, job_role
       FROM interview_sessions
       WHERE user_id = ? AND status = 'completed' AND overall_score IS NOT NULL
       ORDER BY completed_at ASC
       LIMIT 10`,
      [req.user.id]
    );

    // Get MCQ score history
    const mcqScoreHistory = await query(
      `SELECT score, completed_at, job_role, topic
       FROM mcq_sessions
       WHERE user_id = ? AND status = 'completed' AND score IS NOT NULL
       ORDER BY completed_at ASC
       LIMIT 10`,
      [req.user.id]
    );

    // Get performance by job role (interview sessions)
    const roleDistribution = await query(
      `SELECT job_role,
              COUNT(*) as count,
              ROUND(AVG(overall_score), 1) as avg_score
       FROM interview_sessions
       WHERE user_id = ? AND status = 'completed' AND overall_score IS NOT NULL
       GROUP BY job_role
       ORDER BY count DESC
       LIMIT 5`,
      [req.user.id]
    );

    // Get MCQ performance by job role
    const mcqRoleDistribution = await query(
      `SELECT job_role,
              COUNT(*) as count,
              ROUND(AVG(score), 1) as avg_score
       FROM mcq_sessions
       WHERE user_id = ? AND status = 'completed' AND score IS NOT NULL
       GROUP BY job_role
       ORDER BY count DESC
       LIMIT 5`,
      [req.user.id]
    );

    // Get distribution by interview type
    const typeDistribution = await query(
      `SELECT interview_type, 
              COUNT(*) as count,
              ROUND(AVG(overall_score), 1) as avg_score
       FROM interview_sessions
       WHERE user_id = ? AND status = 'completed' AND overall_score IS NOT NULL
       GROUP BY interview_type`,
      [req.user.id]
    );

    // Calculate streak days - FIXED: Use points_streak if available
    let streakDays = pointsStats?.current_streak || stats?.streak_days || 0;
    
    // If no points stats, calculate from activity
    if (!pointsStats) {
      const lastActivity = await getOne(
        `SELECT MAX(created_at) as last_activity
         FROM (
           SELECT created_at FROM interview_sessions WHERE user_id = ?
           UNION
           SELECT created_at FROM mcq_sessions WHERE user_id = ?
         ) as activities`,
        [req.user.id, req.user.id]
      );
      
      if (lastActivity && lastActivity.last_activity) {
        const lastDate = new Date(lastActivity.last_activity);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        lastDate.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
          if (streakDays === 0) streakDays = 1;
        } else if (diffDays === 1) {
          streakDays = Math.max(streakDays + 1, 1);
        } else if (diffDays > 1) {
          streakDays = 0;
        }
      }
    }

    // Send response with points data included
    res.json({
      stats: stats || {
        total_sessions: 0,
        completed_sessions: 0,
        total_questions_answered: 0,
        average_score: 0,
        best_score: 0,
        total_practice_time_seconds: 0,
        streak_days: 0
      },
      pointsStats: pointsStats || {
        total_points: 0,
        current_streak: 0,
        longest_streak: 0
      },
      recentSessions: recentSessions || [],
      recentMCQSessions: recentMCQSessions || [],
      scoreHistory: scoreHistory || [],
      mcqScoreHistory: mcqScoreHistory || [],
      roleDistribution: roleDistribution || [],
      mcqRoleDistribution: mcqRoleDistribution || [],
      typeDistribution: typeDistribution || [],
      streakDays
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/stats/summary - Get quick summary stats
router.get('/summary', authenticate, async (req, res) => {
  try {
    const stats = await getOne(
      'SELECT * FROM user_stats WHERE user_id = ?',
      [req.user.id]
    );

    // Get points stats
    const pointsStats = await getOne(
      'SELECT total_points, current_streak, longest_streak FROM user_points WHERE user_id = ?',
      [req.user.id]
    );

    // Get additional MCQ stats with null handling
    const mcqStats = await getOne(
      `SELECT 
        COUNT(*) as total_mcq_sessions,
        COALESCE(AVG(score), 0) as avg_mcq_score,
        COALESCE(SUM(total_questions), 0) as total_mcq_questions,
        COALESCE(SUM(correct_count), 0) as total_correct_answers
       FROM mcq_sessions
       WHERE user_id = ? AND status = 'completed'`,
      [req.user.id]
    );

    // Get interview stats
    const interviewStats = await getOne(
      `SELECT 
        COUNT(*) as total_interview_sessions,
        COALESCE(AVG(overall_score), 0) as avg_interview_score,
        COALESCE(SUM(answered_questions), 0) as total_interview_questions
       FROM interview_sessions
       WHERE user_id = ? AND status = 'completed'`,
      [req.user.id]
    );

    if (!stats) {
      return res.json({
        totalSessions: 0,
        completedSessions: 0,
        averageScore: 0,
        bestScore: 0,
        totalQuestions: 0,
        totalHours: 0,
        totalMCQSessions: 0,
        averageMCQScore: 0,
        totalMCQQuestions: 0,
        totalCorrectAnswers: 0,
        totalInterviewSessions: 0,
        averageInterviewScore: 0,
        totalInterviewQuestions: 0,
        totalPoints: 0,
        currentStreak: 0,
        longestStreak: 0
      });
    }

    res.json({
      // Interview stats
      totalSessions: stats.total_sessions || 0,
      completedSessions: stats.completed_sessions || 0,
      averageScore: Math.round(stats.average_score || 0),
      bestScore: stats.best_score || 0,
      totalQuestions: stats.total_questions_answered || 0,
      totalHours: Math.round((stats.total_practice_time_seconds || 0) / 3600),
      
      // MCQ stats
      totalMCQSessions: mcqStats?.total_mcq_sessions || 0,
      averageMCQScore: Math.round(mcqStats?.avg_mcq_score || 0),
      totalMCQQuestions: mcqStats?.total_mcq_questions || 0,
      totalCorrectAnswers: mcqStats?.total_correct_answers || 0,
      
      // Additional interview stats
      totalInterviewSessions: interviewStats?.total_interview_sessions || 0,
      averageInterviewScore: Math.round(interviewStats?.avg_interview_score || 0),
      totalInterviewQuestions: interviewStats?.total_interview_questions || 0,
      
      // Points stats
      totalPoints: pointsStats?.total_points || 0,
      currentStreak: pointsStats?.current_streak || 0,
      longestStreak: pointsStats?.longest_streak || 0
    });
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/stats/leaderboard - Get top performers (optional)
router.get('/leaderboard', authenticate, async (req, res) => {
  try {
    // Leaderboard for interview scores
    const interviewLeaderboard = await query(
      `SELECT u.name, u.email, 
              ROUND(us.average_score, 1) as average_score, 
              us.completed_sessions, 
              us.total_sessions,
              us.best_score
       FROM user_stats us
       JOIN users u ON us.user_id = u.id
       WHERE us.completed_sessions > 0 AND us.average_score > 0
       ORDER BY us.average_score DESC
       LIMIT 10`
    );
    
    // Leaderboard for MCQ scores
    const mcqLeaderboard = await query(
      `SELECT u.name, u.email, 
              COUNT(ms.id) as total_sessions,
              ROUND(AVG(ms.score), 1) as avg_mcq_score,
              SUM(ms.correct_count) as total_correct,
              SUM(ms.total_questions) as total_questions
       FROM mcq_sessions ms
       JOIN users u ON ms.user_id = u.id
       WHERE ms.status = 'completed' AND ms.score > 0
       GROUP BY ms.user_id, u.name, u.email
       HAVING total_sessions >= 1
       ORDER BY avg_mcq_score DESC
       LIMIT 10`
    );
    
    // Points leaderboard
    const pointsLeaderboard = await query(
      `SELECT u.name, u.email,
              up.total_points,
              up.current_streak,
              up.longest_streak
       FROM user_points up
       JOIN users u ON up.user_id = u.id
       WHERE up.total_points > 0
       ORDER BY up.total_points DESC
       LIMIT 10`
    );
    
    res.json({ 
      interviewLeaderboard: interviewLeaderboard || [],
      mcqLeaderboard: mcqLeaderboard || [],
      pointsLeaderboard: pointsLeaderboard || []
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/stats/progress - Get progress over time
router.get('/progress', authenticate, async (req, res) => {
  try {
    // Interview progress over time
    const interviewProgress = await query(
      `SELECT DATE(completed_at) as date, 
              ROUND(AVG(overall_score), 1) as avg_score,
              COUNT(*) as sessions_count,
              SUM(answered_questions) as total_questions
       FROM interview_sessions
       WHERE user_id = ? AND status = 'completed' AND completed_at IS NOT NULL
       GROUP BY DATE(completed_at)
       ORDER BY date DESC
       LIMIT 30`,
      [req.user.id]
    );
    
    // MCQ progress over time
    const mcqProgress = await query(
      `SELECT DATE(completed_at) as date, 
              ROUND(AVG(score), 1) as avg_score,
              COUNT(*) as sessions_count,
              SUM(total_questions) as total_questions,
              SUM(correct_count) as correct_answers
       FROM mcq_sessions
       WHERE user_id = ? AND status = 'completed' AND completed_at IS NOT NULL
       GROUP BY DATE(completed_at)
       ORDER BY date DESC
       LIMIT 30`,
      [req.user.id]
    );
    
    // Points progress over time
    const pointsProgress = await query(
      `SELECT DATE(created_at) as date,
              points,
              reason
       FROM points_history
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    
    // Calculate overall progress trend
    const allProgress = [...interviewProgress, ...mcqProgress];
    const averageOverall = allProgress.length > 0 
      ? Math.round(allProgress.reduce((sum, p) => sum + (p.avg_score || 0), 0) / allProgress.length)
      : 0;
    
    res.json({ 
      interviewProgress: interviewProgress || [],
      mcqProgress: mcqProgress || [],
      pointsProgress: pointsProgress || [],
      summary: {
        totalDays: allProgress.length,
        averageOverallScore: averageOverall,
        bestInterviewScore: Math.max(...interviewProgress.map(p => p.avg_score), 0),
        bestMCQScore: Math.max(...mcqProgress.map(p => p.avg_score), 0),
        totalPointsEarned: pointsProgress.reduce((sum, p) => sum + (p.points || 0), 0)
      }
    });
  } catch (error) {
    console.error('Progress error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/stats/weak-areas - Identify weak areas for improvement
router.get('/weak-areas', authenticate, async (req, res) => {
  try {
    // Get low-scoring topics from interviews (score < 60)
    const weakInterviewTopics = await query(
      `SELECT job_role, 
              ROUND(AVG(overall_score), 1) as avg_score,
              COUNT(*) as attempts,
              MAX(created_at) as last_attempt
       FROM interview_sessions
       WHERE user_id = ? AND status = 'completed' AND overall_score < 60 AND overall_score IS NOT NULL
       GROUP BY job_role
       ORDER BY avg_score ASC
       LIMIT 5`,
      [req.user.id]
    );
    
    // Get low-scoring topics from MCQs (score < 60)
    const weakMCQTopics = await query(
      `SELECT job_role, 
              topic,
              ROUND(AVG(score), 1) as avg_score,
              COUNT(*) as attempts,
              MAX(created_at) as last_attempt
       FROM mcq_sessions
       WHERE user_id = ? AND status = 'completed' AND score < 60 AND score IS NOT NULL
       GROUP BY job_role, topic
       ORDER BY avg_score ASC
       LIMIT 5`,
      [req.user.id]
    );
    
    // Get strong areas (score >= 80) for comparison
    const strongInterviewTopics = await query(
      `SELECT job_role, 
              ROUND(AVG(overall_score), 1) as avg_score,
              COUNT(*) as attempts
       FROM interview_sessions
       WHERE user_id = ? AND status = 'completed' AND overall_score >= 80 AND overall_score IS NOT NULL
       GROUP BY job_role
       ORDER BY avg_score DESC
       LIMIT 3`,
      [req.user.id]
    );
    
    res.json({
      weakInterviewTopics: weakInterviewTopics || [],
      weakMCQTopics: weakMCQTopics || [],
      strongInterviewTopics: strongInterviewTopics || [],
      recommendation: weakInterviewTopics.length > 0 || weakMCQTopics.length > 0
        ? 'Focus on practicing the weak areas identified above. Consider taking more targeted sessions.'
        : 'Great job! No major weak areas detected. Keep practicing to maintain your skills!'
    });
  } catch (error) {
    console.error('Weak areas error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/stats/activity - Get activity calendar data
router.get('/activity', authenticate, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const activity = await query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_activities,
        SUM(CASE WHEN created_at IN (SELECT created_at FROM interview_sessions) THEN 1 ELSE 0 END) as interview_count,
        SUM(CASE WHEN created_at IN (SELECT created_at FROM mcq_sessions) THEN 1 ELSE 0 END) as mcq_count
       FROM (
         SELECT created_at FROM interview_sessions WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
         UNION ALL
         SELECT created_at FROM mcq_sessions WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       ) as all_activities
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [req.user.id, days, req.user.id, days]
    );
    
    // Get points activity
    const pointsActivity = await query(
      `SELECT DATE(created_at) as date,
              SUM(points) as points_earned,
              COUNT(*) as activities
       FROM points_history
       WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [req.user.id, days]
    );
    
    res.json({ 
      activity: activity || [],
      pointsActivity: pointsActivity || [],
      totalActiveDays: activity.length,
      streak: calculateStreak(activity)
    });
  } catch (error) {
    console.error('Activity error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to calculate streak from activity data
function calculateStreak(activity) {
  if (!activity || activity.length === 0) return 0;
  
  let streak = 1;
  const dates = activity.map(a => new Date(a.date)).sort((a, b) => b - a);
  
  for (let i = 0; i < dates.length - 1; i++) {
    const diffDays = Math.floor((dates[i] - dates[i + 1]) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      streak++;
    } else if (diffDays > 1) {
      break;
    }
  }
  
  return streak;
}

export default router;