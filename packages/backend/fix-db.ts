import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.development') });

const ds = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME || 'psynq_user',
  password: process.env.DB_PASSWORD || 'mysecretpassword',
  database: process.env.DB_DATABASE || 'psynq_db',
});

async function run() {
  await ds.initialize();
  console.log('Connected to DB. Fixing enums...');

  // 1. Fix User Status Enum
  // PostgreSQL doesn't allow removing values from enum easily, so we add new ones and update old data
  try {
    await ds.query("ALTER TYPE users_status_enum ADD VALUE IF NOT EXISTS 'available'");
    await ds.query("ALTER TYPE users_status_enum ADD VALUE IF NOT EXISTS 'busy'");
    await ds.query("ALTER TYPE users_status_enum ADD VALUE IF NOT EXISTS 'break'");
    await ds.query("ALTER TYPE users_status_enum ADD VALUE IF NOT EXISTS 'wrap_up'");
    await ds.query("ALTER TYPE users_status_enum ADD VALUE IF NOT EXISTS 'offline'");
    
    // Update any legacy 'away' or 'offline' data
    await ds.query("UPDATE users SET status = 'offline' WHERE status NOT IN ('available', 'busy', 'break', 'wrap_up', 'offline')");
    
    console.log('Enums updated successfully.');
  } catch (e) {
    console.error('Error updating enums:', e.message);
  } finally {
    await ds.destroy();
  }
}

run();
