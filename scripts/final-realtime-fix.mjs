import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('\n🔧 FINAL FIX: Enabling Realtime Replication\n');

async function fixRealtime() {
  console.log('Step 1: Testing current realtime status...');
  
  const testChannel = supabase
    .channel('test_realtime_check')
    .on('postgres_changes', { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'room_messages' 
    }, () => {})
    .subscribe((status) => {
      console.log(`   Current status: ${status}`);
      
      if (status === 'CHANNEL_ERROR') {
        console.error('\n❌ REALTIME NOT ENABLED\n');
        console.log('🔧 IMMEDIATE SOLUTION:\n');
        console.log('Option 1 - SQL Editor (Recommended):');
        console.log('   1. Open: https://zvlittinyjciitwazrma.supabase.co/project/default/sql/new');
        console.log('   2. Run this SQL:\n');
        console.log('   ALTER TABLE room_messages REPLICA IDENTITY FULL;');
        console.log('   ALTER TABLE avatar_states REPLICA IDENTITY FULL;');
        console.log('   ALTER TABLE peer_connections REPLICA IDENTITY FULL;');
        console.log('   \n   DO $$ BEGIN');
        console.log('       ALTER PUBLICATION supabase_realtime DROP TABLE room_messages;');
        console.log('   EXCEPTION WHEN OTHERS THEN NULL; END $$;');
        console.log('   ALTER PUBLICATION supabase_realtime ADD TABLE room_messages;');
        console.log('   \n   DO $$ BEGIN');
        console.log('       ALTER PUBLICATION supabase_realtime DROP TABLE avatar_states;');
        console.log('   EXCEPTION WHEN OTHERS THEN NULL; END $$;');
        console.log('   ALTER PUBLICATION supabase_realtime ADD TABLE avatar_states;');
        console.log('   \n   DO $$ BEGIN');
        console.log('       ALTER PUBLICATION supabase_realtime DROP TABLE peer_connections;');
        console.log('   EXCEPTION WHEN OTHERS THEN NULL; END $$;');
        console.log('   ALTER PUBLICATION supabase_realtime ADD TABLE peer_connections;\n');
        
        console.log('Option 2 - Dashboard (Easier):');
        console.log('   1. Open: https://zvlittinyjciitwazrma.supabase.co/project/default/database/replication');
        console.log('   2. Find "room_messages" and toggle it ON');
        console.log('   3. Also enable "avatar_states" and "peer_connections"\n');
        
        console.log('After fixing, restart your dev server (npm run dev)\n');
      } else if (status === 'SUBSCRIBED') {
        console.log('\n✅ REALTIME IS WORKING!\n');
        console.log('If you still see errors in the app:');
        console.log('   1. Hard refresh browser (Ctrl+Shift+R)');
        console.log('   2. Clear browser cache');
        console.log('   3. Close all tabs and reopen\n');
      }
      
      testChannel.unsubscribe();
      process.exit(status === 'CHANNEL_ERROR' ? 1 : 0);
    });
  
  // Timeout after 10 seconds
  setTimeout(() => {
    console.log('\n⏱️  Timeout - could not determine status');
    testChannel.unsubscribe();
    process.exit(1);
  }, 10000);
}

fixRealtime();
