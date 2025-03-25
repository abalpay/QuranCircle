-- Add indexes for performance optimization

-- Users table indexes
CREATE INDEX IF NOT EXISTS users_reset_token_idx ON users(reset_token);
CREATE INDEX IF NOT EXISTS users_email_provider_idx ON users(email, provider_type);

-- Events table indexes
CREATE INDEX IF NOT EXISTS events_created_by_idx ON events(created_by);
CREATE INDEX IF NOT EXISTS events_short_code_idx ON events(short_code);
CREATE INDEX IF NOT EXISTS events_deadline_idx ON events(deadline);

-- Khatms table indexes
CREATE INDEX IF NOT EXISTS khatms_event_id_idx ON khatms(event_id);
CREATE INDEX IF NOT EXISTS khatms_event_khatm_number_idx ON khatms(event_id, khatm_number);
CREATE INDEX IF NOT EXISTS khatms_created_at_idx ON khatms(created_at);

-- Juzs table indexes
CREATE INDEX IF NOT EXISTS juzs_khatm_id_idx ON juzs(khatm_id);
CREATE INDEX IF NOT EXISTS juzs_khatm_juz_number_idx ON juzs(khatm_id, juz_number);
CREATE INDEX IF NOT EXISTS juzs_status_idx ON juzs(status);
CREATE INDEX IF NOT EXISTS juzs_claimed_by_user_id_idx ON juzs(claimed_by_user_id);