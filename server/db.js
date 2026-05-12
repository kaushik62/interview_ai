import pkg from 'pg';
import dotenv from 'dotenv';

const { Client, Pool } = pkg;
dotenv.config();

// Detect if running in production/cloud environment
const isProduction = process.env.NODE_ENV === 'production';
const isCloudDB = process.env.DB_HOST?.includes('aiven.com') || 
                  process.env.DB_HOST?.includes('console.aiven.io') ||
                  process.env.DB_HOST?.includes('aiven.io') ||
                  process.env.DB_HOST?.includes('supabase.com') ||
                  process.env.DB_HOST?.includes('render.com') ||
                  process.env.DB_SSL === 'true';

// Configuration for initial connection (without database name)
const adminConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
  database: "postgres",
  connectionTimeoutMillis: 10000,
};

// Configuration for actual app (with database name)
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "interview_coach",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

// ONLY enable SSL for cloud databases (Render, Aiven, Supabase)
if (isCloudDB) {
  adminConfig.ssl = { rejectUnauthorized: false };
  dbConfig.ssl = { rejectUnauthorized: false };
  console.log('🔒 SSL enabled for cloud database connection');
} else {
  console.log('🔓 SSL disabled for local development');
}

// Function to ensure database exists
const ensureDatabase = async () => {
  // Skip database creation for cloud databases
  if (isCloudDB) {
    console.log('☁️ Cloud database detected - skipping database creation');
    console.log(`✅ Using existing database: ${process.env.DB_NAME || 'interview_coach'}`);
    return true;
  }
  
  const client = new Client(adminConfig);
  
  try {
    await client.connect();
    console.log('✅ Connected to postgres database');
    
    const databaseName = process.env.DB_NAME || "interview_coach";
    
    // Check if database exists
    const res = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [databaseName]
    );
    
    if (res.rows.length === 0) {
      await client.query(`CREATE DATABASE ${databaseName}`);
      console.log(`✅ Database '${databaseName}' created successfully`);
    } else {
      console.log(`✅ Database '${databaseName}' already exists`);
    }
    
  } catch (error) {
    console.error('❌ Error ensuring database:', error.message);
    throw error;
  } finally {
    await client.end();
  }
};

// Create pool
let pool = null;

const createPool = async () => {
  try {
    // First, ensure database exists
    await ensureDatabase();
    
    // Then create pool with the actual database
    pool = new Pool(dbConfig);
    
    // Test connection
    const testQuery = await pool.query('SELECT NOW()');
    console.log(`✅ PostgreSQL connected to database '${dbConfig.database}'`);
    console.log(`📅 Database time: ${testQuery.rows[0].now}`);
    
    pool.on('error', (err) => {
      console.error('Unexpected PostgreSQL error:', err);
    });
    
    return pool;
  } catch (error) {
    console.error("❌ PostgreSQL connection failed:", error.message);
    throw error;
  }
};

// Initialize pool
await createPool();

// Test database connection
export const testConnection = async () => {
  try {
    if (!pool) await createPool();
    await pool.query('SELECT 1');
    console.log("✅ Database connected successfully");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    return false;
  }
};

// Helper function to convert MySQL ? placeholders to PostgreSQL $1, $2
const convertPlaceholders = (sql, params) => {
  if (!params || params.length === 0) return sql;
  let count = 0;
  return sql.replace(/\?/g, () => `$${++count}`);
};

export const initDB = async () => {
  const client = await pool.connect();
  try {
    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        avatar_url VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);

    // Interview sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS interview_sessions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON interview_sessions(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_status ON interview_sessions(status)`);

    // Questions & answers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS interview_qa (
        id VARCHAR(36) PRIMARY KEY,
        session_id VARCHAR(36) NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
        question_number INT NOT NULL,
        question TEXT NOT NULL,
        question_type VARCHAR(50) NOT NULL DEFAULT 'technical',
        difficulty VARCHAR(20) NOT NULL DEFAULT 'medium',
        hints JSONB DEFAULT NULL,
        user_answer TEXT DEFAULT NULL,
        ai_feedback TEXT DEFAULT NULL,
        score INT DEFAULT NULL,
        strengths JSONB DEFAULT NULL,
        improvements JSONB DEFAULT NULL,
        ideal_answer TEXT DEFAULT NULL,
        time_taken_seconds INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        answered_at TIMESTAMP NULL
      )
    `);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_qa_session_id ON interview_qa(session_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_qa_answered ON interview_qa(answered_at)`);

    // User stats table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_stats (
        user_id VARCHAR(36) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        total_sessions INT DEFAULT 0,
        completed_sessions INT DEFAULT 0,
        total_questions_answered INT DEFAULT 0,
        average_score INT DEFAULT 0,
        best_score INT DEFAULT 0,
        total_practice_time_seconds INT DEFAULT 0,
        streak_days INT DEFAULT 0,
        last_session_date DATE DEFAULT NULL
      )
    `);

    // MCQ Sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS mcq_sessions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        job_role VARCHAR(100) NOT NULL,
        experience_level VARCHAR(50),
        topic VARCHAR(100),
        total_questions INT DEFAULT 0,
        correct_count INT DEFAULT 0,
        score INT DEFAULT 0,
        status VARCHAR(20) DEFAULT 'in_progress',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL
      )
    `);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_mcq_user_id ON mcq_sessions(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_mcq_status ON mcq_sessions(status)`);

    // MCQ Questions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS mcq_questions (
        id VARCHAR(36) PRIMARY KEY,
        session_id VARCHAR(36) NOT NULL REFERENCES mcq_sessions(id) ON DELETE CASCADE,
        question_number INT NOT NULL,
        question TEXT NOT NULL,
        options JSONB NOT NULL,
        correct_answer INT NOT NULL,
        explanation TEXT,
        difficulty VARCHAR(20),
        topic VARCHAR(100),
        user_answer INT DEFAULT NULL,
        is_correct BOOLEAN DEFAULT NULL,
        score INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        answered_at TIMESTAMP NULL
      )
    `);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_mcq_questions_session ON mcq_questions(session_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_mcq_questions_number ON mcq_questions(question_number)`);

    // User points table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_points (
        user_id VARCHAR(36) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        total_points INT DEFAULT 0,
        current_streak INT DEFAULT 0,
        longest_streak INT DEFAULT 0,
        last_activity_date DATE,
        total_daily_challenges_completed INT DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Points history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS points_history (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        points INT NOT NULL,
        reason VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_points_user_id ON points_history(user_id)`);

    // Daily challenges table
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_challenges (
        id VARCHAR(36) PRIMARY KEY,
        challenge_date DATE NOT NULL UNIQUE,
        questions JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User challenge completions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_challenge_completions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        challenge_id VARCHAR(36) NOT NULL REFERENCES daily_challenges(id) ON DELETE CASCADE,
        challenge_date DATE NOT NULL,
        score INT DEFAULT 0,
        points_earned INT DEFAULT 0,
        answers JSONB DEFAULT NULL,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, challenge_date)
      )
    `);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_challenge_user_id ON user_challenge_completions(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_challenge_date ON user_challenge_completions(challenge_date)`);

    // Leaderboard cache table
    await client.query(`
      CREATE TABLE IF NOT EXISTS leaderboard_cache (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        user_name VARCHAR(100),
        total_points INT DEFAULT 0,
        current_streak INT DEFAULT 0,
        longest_streak INT DEFAULT 0,
        rank INT DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON leaderboard_cache(rank)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_leaderboard_points ON leaderboard_cache(total_points)`);

    // Create updated_at trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    // Add updated_at triggers
    await client.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_user_points_updated_at ON user_points;
      CREATE TRIGGER update_user_points_updated_at
        BEFORE UPDATE ON user_points
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    console.log("✅ Database tables initialized successfully");
    console.log("   - users");
    console.log("   - interview_sessions");
    console.log("   - interview_qa");
    console.log("   - user_stats");
    console.log("   - mcq_sessions");
    console.log("   - mcq_questions");
    console.log("   - user_points");
    console.log("   - points_history");
    console.log("   - daily_challenges");
    console.log("   - user_challenge_completions");
    console.log("   - leaderboard_cache");
    
  } catch (error) {
    console.error("❌ Database initialization error:", error.message);
    console.error("Error details:", error);
    throw error;
  } finally {
    client.release();
  }
};

// Helper function to execute queries with error handling
export const query = async (sql, params = []) => {
  try {
    if (!pool) await createPool();
    const convertedSql = convertPlaceholders(sql, params);
    const result = await pool.query(convertedSql, params);
    return result.rows;
  } catch (error) {
    console.error("Query error:", error.message);
    console.error("SQL:", sql);
    console.error("Params:", params);
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
  if (!pool) await createPool();
  const client = await pool.connect();
  await client.query('BEGIN');
  return client;
};

// Helper function to commit transaction
export const commitTransaction = async (client) => {
  await client.query('COMMIT');
  client.release();
};

// Helper function to rollback transaction
export const rollbackTransaction = async (client) => {
  await client.query('ROLLBACK');
  client.release();
};

export default pool;