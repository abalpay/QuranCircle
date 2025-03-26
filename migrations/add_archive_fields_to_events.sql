-- Add new columns to events table for archiving functionality
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;

-- Create index for is_archived column to improve query performance
CREATE INDEX IF NOT EXISTS events_is_archived_idx ON events(is_archived);