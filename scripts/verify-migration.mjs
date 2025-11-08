// verify-migration.mjs
// Verify that all tables were created successfully
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🔍 Verifying Database Migration...\n');

const tables = [
  { name: 'profiles', description: 'User profiles and digital twin data' },
  { name: 'avatar_states', description: 'Real-time avatar positions' },
  { name: 'custom_lobbies', description: 'User-created rooms' },
  { name: 'peer_connections', description: 'Voice chat connections' },
  { name: 'room_messages', description: 'Chat messages' }
];

async function verifyTables() {
  let allGood = true;
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table.name)
        .select('id')
        .limit(1);
      
      if (error) {
        console.log(`❌ ${table.name.padEnd(20)} - ERROR: ${error.message || error.error_description || 'Unknown error'}`);
        if (error.details) console.log(`   Details: ${error.details}`);
        if (error.hint) console.log(`   Hint: ${error.hint}`);
        console.log(`   Code: ${error.code || 'N/A'}`);
        allGood = false;
      } else {
        console.log(`✅ ${table.name.padEnd(20)} - ${table.description}`);
      }
    } catch (err) {
      console.log(`❌ ${table.name.padEnd(20)} - EXCEPTION: ${err.message || err.toString()}`);
      allGood = false;
    }
  }
  
  console.log('\n' + '='.repeat(70));
  
  if (allGood) {
    console.log('🎉 SUCCESS! All tables created successfully!');
    console.log('\n✅ Your database is fully set up and ready to use.');
    console.log('\n🚀 Next steps:');
    console.log('   1. Refresh your app at http://localhost:3000');
    console.log('   2. Try creating a profile');
    console.log('   3. Check browser console for success logs');
    console.log('\n💡 The profile creation error should now be resolved!');
  } else {
    console.log('❌ Some tables are missing or have errors.');
    console.log('\n📋 Please:');
    console.log('   1. Check that you ran the SQL in Supabase SQL Editor');
    console.log('   2. Look for error messages in the SQL Editor');
    console.log('   3. Re-run the SQL from EXECUTE_THIS.sql');
    console.log('   4. Check Supabase logs for detailed errors');
  }
  
  console.log('='.repeat(70) + '\n');
}

verifyTables();
