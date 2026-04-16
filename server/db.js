import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'interview_coach',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+05:30',
};

const pool = mysql.createPool(dbConfig);

// Test database connection
export const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

export const initDB = async () => {
  const conn = await pool.getConnection();
  try {
    // Users table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        avatar_url VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email)
      )
    `);

    // Interview sessions table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS interview_sessions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        title VARCHAR(200) NOT NULL,
        job_role VARCHAR(100) NOT NULL,
        experience_level VARCHAR(50) NOT NULL DEFAULT 'mid',
        interview_type VARCHAR(50) NOT NULL DEFAULT 'mixed',
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        total_questions INT DEFAULT 0,
        answered_questions INT DEFAULT 0,
        overall_score INT DEFAULT NULL,
        duration_seconds INT DEFAULT 0,
        started_at TIMESTAMP NULL,
        completed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status)
      )
    `);

    // Questions & answers table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS interview_qa (
        id VARCHAR(36) PRIMARY KEY,
        session_id VARCHAR(36) NOT NULL,
        question_number INT NOT NULL,
        question TEXT NOT NULL,
        question_type VARCHAR(50) NOT NULL DEFAULT 'technical',
        difficulty VARCHAR(20) NOT NULL DEFAULT 'medium',
        hints JSON DEFAULT NULL,
        user_answer TEXT DEFAULT NULL,
        ai_feedback TEXT DEFAULT NULL,
        score INT DEFAULT NULL,
        strengths JSON DEFAULT NULL,
        improvements JSON DEFAULT NULL,
        ideal_answer TEXT DEFAULT NULL,
        time_taken_seconds INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        answered_at TIMESTAMP NULL,
        FOREIGN KEY (session_id) REFERENCES interview_sessions(id) ON DELETE CASCADE,
        INDEX idx_session_id (session_id),
        INDEX idx_answered (answered_at)
      )
    `);

    // User stats table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_stats (
        user_id VARCHAR(36) PRIMARY KEY,
        total_sessions INT DEFAULT 0,
        completed_sessions INT DEFAULT 0,
        total_questions_answered INT DEFAULT 0,
        average_score INT DEFAULT 0,
        best_score INT DEFAULT 0,
        total_practice_time_seconds INT DEFAULT 0,
        streak_days INT DEFAULT 0,
        last_session_date DATE DEFAULT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // MCQ Sessions table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS mcq_sessions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        job_role VARCHAR(100) NOT NULL,
        experience_level VARCHAR(50),
        topic VARCHAR(100),
        total_questions INT DEFAULT 0,
        correct_count INT DEFAULT 0,
        score INT DEFAULT 0,
        status VARCHAR(20) DEFAULT 'in_progress',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status)
      )
    `);

    // User resumes table
    await conn.query(`
  CREATE TABLE IF NOT EXISTS user_resumes (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    resume_text LONGTEXT,
    analysis JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
  )
`);

    // MCQ Questions table - FIXED: using 'question_number' instead of 'question_num' for consistency
    await conn.query(`
      CREATE TABLE IF NOT EXISTS mcq_questions (
        id VARCHAR(36) PRIMARY KEY,
        session_id VARCHAR(36) NOT NULL,
        question_number INT NOT NULL,
        question TEXT NOT NULL,
        options JSON NOT NULL,
        correct_answer INT NOT NULL,
        explanation TEXT,
        difficulty VARCHAR(20),
        topic VARCHAR(100),
        user_answer INT DEFAULT NULL,
        is_correct BOOLEAN DEFAULT NULL,
        score INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        answered_at TIMESTAMP NULL,
        FOREIGN KEY (session_id) REFERENCES mcq_sessions(id) ON DELETE CASCADE,
        INDEX idx_session_id (session_id),
        INDEX idx_question_number (question_number)
      )
    `);

    // Add this inside your initDB function in db.js

    // User points table
    await conn.query(`
  CREATE TABLE IF NOT EXISTS user_points (
    user_id VARCHAR(36) PRIMARY KEY,
    total_points INT DEFAULT 0,
    current_streak INT DEFAULT 0,
    longest_streak INT DEFAULT 0,
    last_activity_date DATE,
    total_daily_challenges_completed INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

    // Points history table
    await conn.query(`
  CREATE TABLE IF NOT EXISTS points_history (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    points INT NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
  )
`);

    // Daily challenges table
    await conn.query(`
  CREATE TABLE IF NOT EXISTS daily_challenges (
    id VARCHAR(36) PRIMARY KEY,
    challenge_date DATE NOT NULL,
    questions JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_date (challenge_date)
  )
`);

    // User challenge completions table
    await conn.query(`
  CREATE TABLE IF NOT EXISTS user_challenge_completions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    challenge_date DATE NOT NULL,
    score INT DEFAULT 0,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_challenge (user_id, challenge_date)
  )
`);

    // Leaderboard cache table - FIXED (rank is reserved keyword)
    await conn.query(`
  CREATE TABLE IF NOT EXISTS leaderboard_cache (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    user_name VARCHAR(100),
    total_points INT DEFAULT 0,
    current_streak INT DEFAULT 0,
    longest_streak INT DEFAULT 0,
    \`rank\` INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_rank (\`rank\`),
    INDEX idx_points (total_points)
  )
`);

    console.log('✅ Database tables initialized successfully');
    console.log('   - users');
    console.log('   - interview_sessions');
    console.log('   - interview_qa');
    console.log('   - user_stats');
    console.log('   - mcq_sessions');
    console.log('   - mcq_questions');

  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    console.error('Error details:', error);
    throw error;
  } finally {
    conn.release();
  }
};

// Helper function to execute queries with error handling
export const query = async (sql, params = []) => {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('Query error:', error.message);
    console.error('SQL:', sql);
    console.error('Params:', params);
    throw error;
  }
};


// Helper function to get single row
export const getOne = async (sql, params = []) => {
  const rows = await query(sql, params);
  return rows[0] || null;
};


// Helper function to start a transaction
export const beginTransaction = async () => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  return connection;
};

// Helper function to commit transaction
export const commitTransaction = async (connection) => {
  await connection.commit();
  connection.release();
};

// Helper function to rollback transaction
export const rollbackTransaction = async (connection) => {
  await connection.rollback();
  connection.release();
};

// Check if database exists and create if not
export const ensureDatabase = async () => {
  const databaseName = dbConfig.database;
  const connection = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
  });

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);
    console.log(`✅ Database '${databaseName}' ensured`);
  } catch (error) {
    console.error('❌ Error creating database:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
};

export default pool;