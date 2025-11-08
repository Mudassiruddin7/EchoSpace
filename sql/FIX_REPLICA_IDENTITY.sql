-- =====================================================================
-- FIX: Mismatch between server and client bindings for postgres changes
-- =====================================================================
-- This error occurs when the table doesn't have proper replica identity
-- for realtime replication tracking
-- =====================================================================

-- Set replica identity to FULL for room_messages
-- This allows Supabase to track all changes for realtime
ALTER TABLE room_messages REPLICA IDENTITY FULL;

-- Do the same for other realtime tables
ALTER TABLE avatar_states REPLICA IDENTITY FULL;
ALTER TABLE peer_connections REPLICA IDENTITY FULL;

-- Now add tables to realtime publication (with error handling)
DO $$ 
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE room_messages;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
ALTER PUBLICATION supabase_realtime ADD TABLE room_messages;

DO $$ 
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE avatar_states;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
ALTER PUBLICATION supabase_realtime ADD TABLE avatar_states;

DO $$ 
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE peer_connections;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
ALTER PUBLICATION supabase_realtime ADD TABLE peer_connections;

-- Verify replica identity
SELECT 
    c.relname as table_name,
    CASE c.relreplident
        WHEN 'd' THEN 'default'
        WHEN 'n' THEN 'nothing'
        WHEN 'f' THEN 'full'
        WHEN 'i' THEN 'index'
    END as replica_identity
FROM pg_class c
WHERE c.relname IN ('room_messages', 'avatar_states', 'peer_connections')
    AND c.relnamespace = 'public'::regnamespace;

-- Verify tables in publication
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
    AND tablename IN ('room_messages', 'avatar_states', 'peer_connections');
