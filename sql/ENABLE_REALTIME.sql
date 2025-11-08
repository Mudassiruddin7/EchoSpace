-- =====================================================================
-- FIX CHAT SUBSCRIPTION ERROR (CHANNEL_ERROR)
-- =====================================================================
-- This enables Supabase Realtime replication for tables used in the app
-- Execute this in Supabase SQL Editor: 
-- https://zvlittinyjciitwazrma.supabase.co/project/default/sql/new
-- =====================================================================

-- Enable realtime for chat messages
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE room_messages;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
ALTER PUBLICATION supabase_realtime ADD TABLE room_messages;

-- Enable realtime for avatar position updates
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE avatar_states;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
ALTER PUBLICATION supabase_realtime ADD TABLE avatar_states;

-- Enable realtime for voice chat connections
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE peer_connections;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
ALTER PUBLICATION supabase_realtime ADD TABLE peer_connections;

-- Verify tables added to replication
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- =====================================================================
-- ALTERNATIVE: Manual Dashboard Method
-- =====================================================================
-- If SQL method doesn't work, use the dashboard:
-- 1. Go to: Database > Replication
-- 2. Find 'room_messages' and toggle ON
-- 3. Also enable 'avatar_states' and 'peer_connections'
-- =====================================================================
