-- FIX PERMISSIONS - Run this in Supabase SQL Editor
-- This grants necessary permissions to the anon role

-- First, create room_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS room_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lobby_id TEXT NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_room_messages_lobby_id ON room_messages(lobby_id);
CREATE INDEX IF NOT EXISTS idx_room_messages_created_at ON room_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_room_messages_lobby_time ON room_messages(lobby_id, created_at DESC);

-- Grant usage on public schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant permissions on all tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated;

-- Specifically grant on our tables
GRANT ALL ON profiles TO anon, authenticated;
GRANT ALL ON avatar_states TO anon, authenticated;
GRANT ALL ON custom_lobbies TO anon, authenticated;
GRANT ALL ON peer_connections TO anon, authenticated;
GRANT ALL ON room_messages TO anon, authenticated;

-- Ensure RLS is enabled but with permissive policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE avatar_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_lobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Public access to profiles" ON profiles;
DROP POLICY IF EXISTS "Public access to avatar_states" ON avatar_states;
DROP POLICY IF EXISTS "Public access to custom_lobbies" ON custom_lobbies;
DROP POLICY IF EXISTS "Public access to peer_connections" ON peer_connections;
DROP POLICY IF EXISTS "Public access to room_messages" ON room_messages;

-- Create permissive policies for all operations
CREATE POLICY "Public access to profiles" ON profiles
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public access to avatar_states" ON avatar_states
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public access to custom_lobbies" ON custom_lobbies
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public access to peer_connections" ON peer_connections
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public access to room_messages" ON room_messages
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- ENABLE REALTIME REPLICATION (Required for live chat)
-- ============================================================================

-- Enable realtime for room_messages (for live chat)
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS room_messages;

-- Enable realtime for avatar_states (for live avatar updates)
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS avatar_states;

-- Enable realtime for peer_connections (for voice chat)
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS peer_connections;
