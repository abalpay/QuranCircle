-- Add archive and delete fields to khatms table
ALTER TABLE khatms 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Create indexes for the new fields
CREATE INDEX IF NOT EXISTS khatms_is_archived_idx ON khatms(is_archived);
CREATE INDEX IF NOT EXISTS khatms_is_deleted_idx ON khatms(is_deleted);