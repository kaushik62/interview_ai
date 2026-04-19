import { query } from './db.js';

async function test() {
  try {
    const [result] = await query(`
      SELECT 
        user_id,
        user_name,
        total_points,
        current_streak,
        longest_streak,
        \`rank\`
      FROM leaderboard_cache
      ORDER BY \`rank\` ASC
    `);
    console.log('Query result:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

test();