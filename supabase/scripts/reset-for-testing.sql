-- QuranCircle: Full reset for testing email confirmation flow
-- Run in Supabase Dashboard → SQL Editor
--
-- WARNING: This deletes ALL data including your account.
-- You will need to sign up again after running this.

-- Delete all custom data (cascades handle relationships)
TRUNCATE TABLE public.bookmarks CASCADE;
TRUNCATE TABLE public.juzs CASCADE;
TRUNCATE TABLE public.khatms CASCADE;
TRUNCATE TABLE public.events CASCADE;

-- Delete auth users (required to test signup confirmation flow)
DELETE FROM auth.users;
