# Supabase Scripts

Utility scripts for QuranCircle development and testing.

| Script | Purpose |
|--------|---------|
| `reset-for-testing.sql` | Full wipe: clears all tables and auth users. Use to test signup/email confirmation from scratch. |
| `delete-user-for-testing.sql` | Delete a single auth user. Events and khatms remain; bookmarks and user references are cascaded. |

**How to run:** Copy the SQL into [Supabase Dashboard → SQL Editor](https://supabase.com/dashboard) and execute.
