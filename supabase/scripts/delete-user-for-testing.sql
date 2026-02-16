-- QuranCircle: Delete a single user for testing email confirmation
-- Run in Supabase Dashboard → SQL Editor
--
-- Cascades: bookmarks deleted, events.created_by and juzs.claimed_by_user_id set to NULL

-- 1. Find your user ID
SELECT id, email FROM auth.users;

-- 2. Delete the user (replace YOUR_USER_ID with the UUID from step 1)
-- DELETE FROM auth.users WHERE id = 'YOUR_USER_ID';
