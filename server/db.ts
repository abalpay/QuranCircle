import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { users, events, khatms, juzs } from '@shared/schema';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const { Pool } = pg;

// Create a PostgreSQL connection pool optimized for high traffic
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
  max: 75, // Further increased for higher concurrency
  min: 10, // Maintain more idle connections for sudden traffic spikes
  idleTimeoutMillis: 60000, // Keep connections alive longer
  connectionTimeoutMillis: 10000, // Longer timeout for connection stability under load
  allowExitOnIdle: false, // Prevent pool from shutting down during idle periods
  maxUses: 10000, // Recycle connections after max uses to prevent memory issues
  statement_timeout: 10000, // Prevent long-running queries
  query_timeout: 10000, // Timeout for queries
});

// Add error handling for pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Create a Drizzle ORM instance with our schema
export const db = drizzle(pool, { schema: { users, events, khatms, juzs } });

// Function to run migrations
export async function runMigrations() {
  try {
    console.log('Running migrations...');
    
    // For development, we'll use direct schema push
    // For production, we'd use proper migrations
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        provider_type TEXT,
        provider_id TEXT,
        reset_token TEXT,
        reset_token_expiry TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        is_public BOOLEAN NOT NULL DEFAULT FALSE,
        deadline TIMESTAMP,
        created_by INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS khatms (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL,
        khatm_number INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS juzs (
        id SERIAL PRIMARY KEY,
        khatm_id INTEGER NOT NULL,
        juz_number INTEGER NOT NULL,
        claimed_by_name TEXT,
        claimed_by_user_id INTEGER,
        status TEXT NOT NULL DEFAULT 'unclaimed',
        claimed_at TIMESTAMP,
        read_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      );
    `);
    
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}

// Export the Drizzle query builder
export * from 'drizzle-orm';