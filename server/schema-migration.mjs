/** PostgreSQL IF NOT EXISTS alone does not serialize concurrent pg_type creation. */
export async function ensureSchema(pool, name, sql) {
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`star-tide-schema:${name}`]);
    await db.query(sql);
    await db.query('COMMIT');
  } catch (error) { await db.query('ROLLBACK'); throw error; }
  finally { db.release(); }
}
