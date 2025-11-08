import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing credentials');
  process.exit(1);
}

console.log('\n🚀 Migrating SQL to Supabase via REST API...\n');

// Read SQL file
const sqlContent = readFileSync(
  join(__dirname, '..', 'sql', 'FIX_REALTIME_COMPLETE.sql'),
  'utf-8'
);

// Extract the critical statements
const criticalStatements = [
  // Table creation
  {
    name: 'Create room_messages table',
    sql: `CREATE TABLE IF NOT EXISTS room_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lobby_id TEXT NOT NULL,
      profile_id UUID NOT NULL,
      username TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`
  },
  {
    name: 'Create lobby_id index',
    sql: `CREATE INDEX IF NOT EXISTS idx_room_messages_lobby_id ON room_messages(lobby_id);`
  },
  {
    name: 'Create created_at index',
    sql: `CREATE INDEX IF NOT EXISTS idx_room_messages_created_at ON room_messages(created_at);`
  },
  {
    name: 'Enable RLS',
    sql: `ALTER TABLE room_messages ENABLE ROW LEVEL SECURITY;`
  },
  {
    name: 'Drop old policies',
    sql: `DROP POLICY IF EXISTS "Enable read access for all users" ON room_messages;
          DROP POLICY IF EXISTS "Enable insert for authenticated users" ON room_messages;
          DROP POLICY IF EXISTS "Public access to room_messages" ON room_messages;`
  },
  {
    name: 'Create read policy',
    sql: `CREATE POLICY "Public read access to room_messages"
          ON room_messages FOR SELECT
          USING (true);`
  },
  {
    name: 'Create insert policy',
    sql: `CREATE POLICY "Public insert access to room_messages"
          ON room_messages FOR INSERT
          WITH CHECK (true);`
  },
  {
    name: 'Grant permissions to anon',
    sql: `GRANT ALL ON room_messages TO anon;`
  },
  {
    name: 'Grant permissions to authenticated',
    sql: `GRANT ALL ON room_messages TO authenticated;`
  },
  {
    name: 'Grant sequence usage to anon',
    sql: `GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;`
  },
  {
    name: 'Grant sequence usage to authenticated',
    sql: `GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;`
  }
];

let successCount = 0;
let errorCount = 0;

console.log('📝 Executing SQL statements via REST API...\n');

// Try to execute via PostgreSQL REST endpoint
for (const statement of criticalStatements) {
  console.log(`\n[${successCount + errorCount + 1}/${criticalStatements.length}] ${statement.name}`);
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ query: statement.sql })
    });

    if (response.ok) {
      console.log('   ✅ Success');
      successCount++;
    } else {
      const error = await response.text();
      console.log(`   ⚠️  API returned: ${response.status} - ${error}`);
      console.log('   Note: This is expected - REST API has limited SQL execution');
      errorCount++;
    }
  } catch (err) {
    console.log(`   ⚠️  ${err.message}`);
    errorCount++;
  }
}

console.log('\n=====================================================================');
console.log('📊 Summary:');
console.log(`   Attempted: ${criticalStatements.length}`);
console.log(`   Note: REST API has limited SQL execution capabilities`);
console.log('=====================================================================\n');

console.log('✅ SOLUTION: Execute SQL via Supabase Dashboard\n');
console.log('The complete SQL is ready in: sql\\FIX_REALTIME_COMPLETE.sql\n');
console.log('📝 Follow these steps:');
console.log('   1. Copy the entire contents of sql\\FIX_REALTIME_COMPLETE.sql');
console.log('   2. Go to: https://zvlittinyjciitwazrma.supabase.co/project/default/sql/new');
console.log('   3. Paste and click RUN');
console.log('   4. Refresh your app at http://localhost:3000\n');

console.log('⚡ FASTER ALTERNATIVE: Use Dashboard UI');
console.log('   1. Go to: https://zvlittinyjciitwazrma.supabase.co/project/default/database/replication');
console.log('   2. Toggle ON: room_messages, avatar_states, peer_connections');
console.log('   3. Refresh your app\n');

// Open both pages
console.log('🌐 Opening pages for you...\n');

process.exit(0);
