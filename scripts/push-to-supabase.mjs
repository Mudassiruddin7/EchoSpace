// push-to-supabase.mjs
// Direct SQL execution to Supabase database
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🚀 Pushing SQL to Supabase...\n');
console.log(`📡 Project: ${SUPABASE_URL}`);

// Define migration order
const migrations = [
  // First create the profiles table (required by custom_lobbies)
  {
    name: '01_create_profiles',
    sql: `
-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  selected_avatar_model TEXT NOT NULL,
  ai_personality_prompt TEXT,
  bio TEXT DEFAULT '',
  interests TEXT[] DEFAULT '{}'::TEXT[],
  preferred_greeting TEXT,
  personality_type TEXT,
  total_time_online INTEGER DEFAULT 0,
  favorite_lobby TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles(last_seen DESC);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to profiles" ON profiles;
CREATE POLICY "Public access to profiles" ON profiles FOR ALL USING (true);
`
  },
  // Create avatar_states table
  {
    name: '02_create_avatar_states',
    sql: `
CREATE TABLE IF NOT EXISTS avatar_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lobby_id TEXT NOT NULL,
  position JSONB DEFAULT '{"x": 0, "y": 0, "z": 0}'::JSONB,
  rotation JSONB DEFAULT '{"x": 0, "y": 0, "z": 0}'::JSONB,
  animation TEXT DEFAULT 'Idle',
  equipped_weapon JSONB,
  is_online BOOLEAN DEFAULT true,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ai_behavior TEXT DEFAULT 'idle',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, lobby_id)
);

CREATE INDEX IF NOT EXISTS idx_avatar_states_profile_id ON avatar_states(profile_id);
CREATE INDEX IF NOT EXISTS idx_avatar_states_lobby_id ON avatar_states(lobby_id);
CREATE INDEX IF NOT EXISTS idx_avatar_states_online ON avatar_states(is_online) WHERE is_online = true;

ALTER TABLE avatar_states ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to avatar_states" ON avatar_states;
CREATE POLICY "Public access to avatar_states" ON avatar_states FOR ALL USING (true);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_avatar_states_updated_at ON avatar_states;
CREATE TRIGGER update_avatar_states_updated_at
  BEFORE UPDATE ON avatar_states
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`
  },
  // Create custom_lobbies from sql/supabase-schema.sql
  {
    name: '03_create_custom_lobbies',
    file: 'sql/supabase-schema.sql'
  },
  // Add host fields from sql/database-migration-host-fields.sql
  {
    name: '04_add_host_fields',
    sql: `
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'custom_lobbies' 
    AND column_name = 'host_uses_creator_profile'
  ) THEN
    ALTER TABLE custom_lobbies
    ADD COLUMN host_uses_creator_profile BOOLEAN DEFAULT true NOT NULL,
    ADD COLUMN custom_host_name TEXT,
    ADD COLUMN custom_host_avatar TEXT,
    ADD COLUMN additional_host_knowledge TEXT;
  END IF;
END $$;

COMMENT ON COLUMN custom_lobbies.host_uses_creator_profile IS 'If true, use the room creator profile as host. If false, use custom host settings.';
COMMENT ON COLUMN custom_lobbies.custom_host_name IS 'Custom host name when not using creator profile';
COMMENT ON COLUMN custom_lobbies.custom_host_avatar IS 'Custom host avatar path when not using creator profile';
COMMENT ON COLUMN custom_lobbies.additional_host_knowledge IS 'Additional context/knowledge for the room host (AI personality enhancement)';
`
  },
  // Fix RLS policies from sql/fix-rls-policies.sql
  {
    name: '05_fix_rls_policies',
    sql: `
DROP POLICY IF EXISTS "Anyone can view public lobbies" ON custom_lobbies;
DROP POLICY IF EXISTS "Users can create lobbies" ON custom_lobbies;
DROP POLICY IF EXISTS "Users can update own lobbies" ON custom_lobbies;
DROP POLICY IF EXISTS "Users can delete own lobbies" ON custom_lobbies;

ALTER TABLE custom_lobbies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access to custom_lobbies" ON custom_lobbies;
CREATE POLICY "Public access to custom_lobbies" ON custom_lobbies FOR ALL USING (true);
`
  },
  // Create peer_connections from sql/peer_connections.sql
  {
    name: '06_create_peer_connections',
    file: 'sql/peer_connections.sql'
  },
  // Create room_messages
  {
    name: '07_create_room_messages',
    file: 'database/create_room_messages.sql'
  }
];

async function executeSQLFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (!fs.existsSync(fullPath)) {
    return { skipped: true, reason: 'File not found' };
  }
  return fs.readFileSync(fullPath, 'utf8');
}

async function runMigration(migration) {
  console.log(`\n📝 Running: ${migration.name}`);
  
  let sql;
  if (migration.file) {
    const result = await executeSQLFile(migration.file);
    if (result.skipped) {
      console.log(`   ⚠️  Skipped: ${result.reason}`);
      return { success: true, skipped: true };
    }
    sql = result;
  } else {
    sql = migration.sql;
  }

  // Split into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 5 && !s.startsWith('--'));

  let executed = 0;
  let failed = 0;
  const errors = [];

  for (const statement of statements) {
    try {
      // Use Supabase's RPC to execute raw SQL
      const { error } = await supabase.rpc('exec', { sql: statement + ';' });
      
      if (error) {
        // Try direct table operations for simple cases
        if (statement.toUpperCase().includes('CREATE TABLE')) {
          // Tables need to be created via SQL editor
          console.log(`   ⚠️  CREATE TABLE detected - needs manual execution`);
        } else if (error.message?.includes('already exists') || 
                   error.message?.includes('does not exist') ||
                   error.code === '42P07') {
          executed++;
        } else {
          console.log(`   ❌ ${error.message?.substring(0, 80)}`);
          errors.push(error.message);
          failed++;
        }
      } else {
        executed++;
      }
    } catch (err) {
      // Expected for most operations since exec RPC doesn't exist
      executed++; // Mark as executed since we'll use manual method
    }
  }

  return { 
    success: failed === 0, 
    executed, 
    failed, 
    errors,
    totalStatements: statements.length 
  };
}

async function checkTables() {
  console.log('\n🔍 Checking existing tables...\n');
  
  const tables = ['profiles', 'avatar_states', 'custom_lobbies', 'peer_connections', 'room_messages'];
  const results = {};
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      results[table] = !error;
      console.log(`   ${!error ? '✅' : '❌'} ${table}: ${!error ? 'EXISTS' : 'NOT FOUND'}`);
    } catch (err) {
      results[table] = false;
      console.log(`   ❌ ${table}: NOT FOUND`);
    }
  }
  
  return results;
}

// Main execution
(async () => {
  const existingTables = await checkTables();
  
  if (Object.values(existingTables).every(v => v === true)) {
    console.log('\n✅ All tables already exist!');
    console.log('🎉 Database is fully set up.');
    console.log('\n🚀 You can now use the application.');
    process.exit(0);
  }

  console.log('\n' + '='.repeat(70));
  console.log('⚠️  AUTOMATED MIGRATION NOT POSSIBLE');
  console.log('='.repeat(70));
  console.log('\nSupabase REST API does not support direct SQL execution.');
  console.log('You must manually run the SQL in Supabase Dashboard.\n');
  
  console.log('📋 STEP-BY-STEP INSTRUCTIONS:\n');
  console.log('1. Open Supabase Dashboard:');
  console.log(`   ${SUPABASE_URL.replace('/rest/v1', '')}/project/default/sql/new\n`);
  console.log('2. Copy and paste this complete SQL:\n');
  
  console.log('='.repeat(70));
  
  // Generate complete SQL
  let completeSql = '-- EchoSpace RPG - Complete Database Schema\n\n';
  
  for (const migration of migrations) {
    completeSql += `-- ${migration.name}\n`;
    if (migration.file) {
      const sql = await executeSQLFile(migration.file);
      if (!sql.skipped) {
        completeSql += sql + '\n\n';
      }
    } else {
      completeSql += migration.sql + '\n\n';
    }
  }
  
  console.log(completeSql);
  console.log('='.repeat(70));
  
  // Save to file
  const outputPath = path.join(__dirname, '../EXECUTE_THIS.sql');
  fs.writeFileSync(outputPath, completeSql);
  
  console.log(`\n✅ SQL saved to: EXECUTE_THIS.sql`);
  console.log('\n📋 Quick Steps:');
  console.log('   1. Copy contents of EXECUTE_THIS.sql');
  console.log('   2. Paste into Supabase SQL Editor');
  console.log('   3. Click RUN');
  console.log('   4. Refresh your app\n');
})();
