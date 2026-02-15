-- Enable Supabase Realtime for the juzs table so that
-- postgres_changes events are broadcast to connected clients.
ALTER PUBLICATION supabase_realtime ADD TABLE juzs;
