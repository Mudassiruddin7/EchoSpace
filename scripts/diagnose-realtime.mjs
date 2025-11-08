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

console.log('\n🔍 Diagnosing Chat Subscription Issue...\n');

// Test 1: Check table structure
console.log('📋 Test 1: Checking room_messages table structure...');
try {
  const { data, error } = await supabase
    .from('room_messages')
    .select('*')
    .limit(0);
  
  if (error) {
    console.error('❌ Error accessing table:', error.message);
    console.error('   Code:', error.code);
    console.error('   Details:', error.details);
  } else {
    console.log('✅ Table is accessible');
  }
} catch (err) {
  console.error('❌ Exception:', err.message);
}

// Test 2: Check if realtime is enabled
console.log('\n📡 Test 2: Testing realtime subscription...');
let subscriptionStatus = 'PENDING';
let subscriptionError = null;

const channel = supabase
  .channel('test_diagnostic_channel')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'room_messages'
    },
    (payload) => {
      console.log('✅ Received realtime event:', payload);
    }
  )
  .subscribe((status, err) => {
    subscriptionStatus = status;
    subscriptionError = err;
    console.log(`   Status: ${status}`);
    if (err) {
      console.error('   Error:', err);
    }
  });

// Wait for subscription
await new Promise(resolve => setTimeout(resolve, 5000));

console.log('\n📊 Final Status:', subscriptionStatus);

if (subscriptionStatus === 'CHANNEL_ERROR') {
  console.error('\n❌ DIAGNOSIS: Realtime is NOT properly enabled\n');
  console.log('SOLUTION: Execute one of these SQL statements:\n');
  console.log('Option 1 - Drop and recreate the table with correct replica identity:');
  console.log('   ALTER TABLE room_messages REPLICA IDENTITY FULL;');
  console.log('   ALTER PUBLICATION supabase_realtime ADD TABLE room_messages;\n');
  console.log('Option 2 - Use the Dashboard:');
  console.log('   1. Go to: Database > Replication');
  console.log('   2. Toggle ON: room_messages\n');
} else if (subscriptionStatus === 'SUBSCRIBED') {
  console.log('\n✅ DIAGNOSIS: Realtime IS working!');
  console.log('   The error might be due to:');
  console.log('   1. Stale browser cache - Hard refresh (Ctrl+Shift+R)');
  console.log('   2. Multiple tabs - Close other tabs');
  console.log('   3. Network issues - Check console Network tab\n');
}

await channel.unsubscribe();
process.exit(0);
