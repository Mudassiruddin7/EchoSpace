import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('\n🔍 Checking Realtime Subscription Status...\n');

// Test realtime subscription
const testSubscription = async () => {
  return new Promise((resolve) => {
    const channel = supabase
      .channel('test_room_messages')
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
        console.log(`📡 Subscription status: ${status}`);
        if (err) {
          console.error('❌ Subscription error:', err);
        }
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime replication is ENABLED for room_messages');
          console.log('🎉 Chat should work without polling fallback!\n');
          channel.unsubscribe();
          resolve(true);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ CHANNEL_ERROR: Realtime replication is NOT enabled');
          console.log('\n📋 To fix this, run ONE of these commands:\n');
          console.log('SQL Method:');
          console.log('  Copy/paste ENABLE_REALTIME.sql into Supabase SQL Editor and click RUN\n');
          console.log('Dashboard Method:');
          console.log('  1. Open: https://zvlittinyjciitwazrma.supabase.co/project/default/database/replication');
          console.log('  2. Toggle ON: room_messages, avatar_states, peer_connections\n');
          channel.unsubscribe();
          resolve(false);
        }
        
        // Timeout after 10 seconds
        setTimeout(() => {
          if (status !== 'SUBSCRIBED' && status !== 'CHANNEL_ERROR') {
            console.log('⏱️  Subscription timeout - status:', status);
            channel.unsubscribe();
            resolve(false);
          }
        }, 10000);
      });
  });
};

try {
  await testSubscription();
} catch (error) {
  console.error('❌ Test failed:', error);
}

process.exit(0);
