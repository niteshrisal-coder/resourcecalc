import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const connectionString = process.env.NEON_DATABASE_URL;
const sql = neon(connectionString);

async function checkDatabase() {
  console.log('Testing connection to Neon...');
  
  try {
    // Test 1: Simple query
    const result = await sql`SELECT 1 as test`;
    console.log('✅ Connection successful!', result);
    
    // Test 2: Check if tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name IN ('norms', 'norm_resources')
    `;
    
    console.log('\nTables found:', tables.map(t => t.table_name));
    
    if (tables.length === 0) {
      console.log('\n❌ PROBLEM: Neither "norms" nor "norm_resources" tables exist!');
      console.log('You need to create these tables in your Neon database.');
    } else if (tables.length === 1) {
      console.log('\n⚠️ Only one table exists. You need both.');
    } else {
      console.log('\n✅ Both tables exist! The issue is somewhere else.');
    }
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('\nFull error:', error);
  }
}

checkDatabase();