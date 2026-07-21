-- QuranCircle: Delete a single user for testing email confirmation
-- Run in Supabase Dashboard → SQL Editor
--
-- The auth.users deletion trigger atomically removes memberships/bookmarks,
-- clears event ownership, and fully resets claimed Juz rows to unclaimed.

-- 1. Find your user ID
SELECT id, email FROM auth.users;

-- 2. Delete the user (replace YOUR_USER_ID with the UUID from step 1)
-- DELETE FROM auth.users WHERE id = 'YOUR_USER_ID';
