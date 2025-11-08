import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('\n🚀 Starting Supabase Migration...\n');

// Read the SQL file
const sqlContent = readFileSync(
  join(__dirname, '..', 'sql', 'FIX_REALTIME_COMPLETE.sql'),
  'utf-8'
);

// Split SQL into individual statements
const statements = sqlContent
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

// Execute each statement
let successCount = 0;
let errorCount = 0;

for (let i = 0; i < statements.length; i++) {
  const statement = statements[i];
  
  // Skip comments and empty statements
  if (statement.startsWith('--') || statement.startsWith('/*') || statement.length < 10) {
    continue;
  }

  // Get first line for logging
  const firstLine = statement.split('\n')[0].substring(0, 80);
  console.log(`\n[${i + 1}/${statements.length}] Executing: ${firstLine}...`);

  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: statement + ';'
    });

    if (error) {
      // Try alternative method - direct query
      console.log('   Trying alternative method...');
      
      // For specific operations, use alternative approaches
      if (statement.includes('ALTER PUBLICATION')) {
        console.log('   ⚠️  ALTER PUBLICATION requires SQL Editor - noted for manual execution');
        errorCount++;
        continue;
      }
      
      if (statement.includes('CREATE TABLE')) {
        const match = statement.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/);
        if (match) {
          const tableName = match[1];
          console.log(`   Checking if table ${tableName} exists...`);
          const { error: checkError } = await supabase.from(tableName).select('id').limit(1);
          if (!checkError) {
            console.log(`   ✅ Table ${tableName} already exists`);
            successCount++;
            continue;
          }
        }
      }

      console.error(`   ❌ Error: ${error.message}`);
      if (error.details) console.error(`   Details: ${error.details}`);
      if (error.hint) console.error(`   Hint: ${error.hint}`);
      errorCount++;
    } else {
      console.log('   ✅ Success');
      successCount++;
    }
  } catch (err) {
    console.error(`   ❌ Exception: ${err.message}`);
    errorCount++;
  }
}

console.log('\n=====================================================================');
console.log('📊 Migration Summary:');
console.log(`   ✅ Successful: ${successCount}`);
console.log(`   ❌ Failed: ${errorCount}`);
console.log('=====================================================================\n');

if (errorCount > 0) {
  console.log('⚠️  Some statements failed. This is normal for:');
  console.log('   - ALTER PUBLICATION commands (requires SQL Editor)');
  console.log('   - Statements that need admin privileges\n');
  console.log('📝 Manual steps required:');
  console.log('   1. Open: https://zvlittinyjciitwazrma.supabase.co/project/default/sql/new');
  console.log('   2. Execute: sql\\FIX_REALTIME_COMPLETE.sql');
  console.log('   3. Or use Dashboard: Database > Replication > Enable room_messages\n');
}

// Verify the setup
console.log('🔍 Verifying setup...\n');

const tables = ['room_messages', 'profiles', 'avatar_states', 'custom_lobbies', 'peer_connections'];

for (const table of tables) {
  try {
    const { data, error } = await supabase.from(table).select('id').limit(1);
    if (error) {
      console.log(`   ❌ ${table}: ${error.message}`);
    } else {
      console.log(`   ✅ ${table}: Accessible`);
    }
  } catch (err) {
    console.log(`   ❌ ${table}: ${err.message}`);
  }
}

console.log('\n✅ Migration script completed!\n');
process.exit(errorCount > 0 ? 1 : 0);
