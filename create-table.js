import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const connectionString = process.env.NEON_DATABASE_URL;
const sql = neon(connectionString);

async function createTable() {
  console.log('Creating norm_resources table...');
  
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS norm_resources (
        id SERIAL PRIMARY KEY,
        norm_id INTEGER NOT NULL REFERENCES norms(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        quantity DECIMAL(10,2) NOT NULL,
        unit TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        is_percentage BOOLEAN DEFAULT FALSE,
        percentage_base TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    console.log('✅ norm_resources table created successfully!');
    
    // Verify it exists now
    const check = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'norm_resources'
    `;
    
    if (check.length > 0) {
      console.log('✅ Verification: norm_resources table now exists');
    }
    
  } catch (error) {
    console.error('❌ Failed to create table:', error.message);
  }
}

createTable();