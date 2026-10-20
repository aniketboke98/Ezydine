import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || '',
  max: 20,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
