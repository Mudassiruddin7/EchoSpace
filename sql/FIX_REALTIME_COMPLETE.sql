-- =====================================================================
-- COMPLETE FIX FOR CHAT SUBSCRIPTION CHANNEL_ERROR
-- =====================================================================
-- This script ensures:
-- 1. room_messages table exists
-- 2. RLS policies allow realtime access
-- 3. Realtime replication is enabled
-- =====================================================================

-- 1. Ensure table exists
CREATE TABLE IF NOT EXISTS room_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lobby_id TEXT NOT NULL,
    profile_id UUID NOT NULL,
    username TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_room_messages_lobby_id ON room_messages(lobby_id);
CREATE INDEX IF NOT EXISTS idx_room_messages_created_at ON room_messages(created_at);

-- 3. Enable RLS
ALTER TABLE room_messages ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if any
DROP POLICY IF EXISTS "Enable read access for all users" ON room_messages;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON room_messages;
DROP POLICY IF EXISTS "Public access to room_messages" ON room_messages;

-- 5. Create permissive policies for both anon and authenticated
CREATE POLICY "Public read access to room_messages"
    ON room_messages FOR SELECT
    USING (true);

CREATE POLICY "Public insert access to room_messages"
    ON room_messages FOR INSERT
    WITH CHECK (true);

-- 6. Grant table permissions
GRANT ALL ON room_messages TO anon;
GRANT ALL ON room_messages TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 7. Enable Realtime replication (THIS IS CRITICAL)
-- Note: Ignore errors if table not in publication
DO $$ 
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE room_messages;
EXCEPTION WHEN OTHERS THEN
    NULL; -- Ignore if table not in publication
END $$;
ALTER PUBLICATION supabase_realtime ADD TABLE room_messages;

-- 8. Verify realtime is enabled
SELECT 
    schemaname, 
    tablename,
    'Realtime enabled ✅' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename IN ('room_messages', 'avatar_states', 'peer_connections');

-- If no rows returned above, realtime is NOT enabled. Re-run this script.

-- =====================================================================
-- VERIFICATION QUERY
-- =====================================================================
-- Run this separately to check if everything is working:
/*
SELECT 
    'Table exists' as check_type,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'room_messages') as passed
UNION ALL
SELECT 
    'RLS enabled',
    relrowsecurity
FROM pg_class 
WHERE relname = 'room_messages'
UNION ALL
SELECT 
    'Realtime enabled',
    EXISTS(
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'room_messages'
    )
UNION ALL
SELECT 
    'Read policy exists',
    EXISTS(
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'room_messages' AND cmd = 'SELECT'
    )
UNION ALL
SELECT 
    'Insert policy exists',
    EXISTS(
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'room_messages' AND cmd = 'INSERT'
    );
*/
