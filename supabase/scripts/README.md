# Supabase Scripts

Utility scripts for QuranCircle development and testing.

| Script | Purpose |
|--------|---------|
| `reset-for-testing.sql` | Full wipe: clears all tables and auth users. Use to test signup/email confirmation from scratch. |
| `delete-user-for-testing.sql` | Delete a single auth user. Events and khatms remain; bookmarks and user references are cascaded. |
| `verify-membership-hardening.sql` | Verifies direct `event_members` inserts are blocked while `ensure_event_membership(short_code)` still works. |
| `verify-merge-rpc-hardening.sql` | Verifies legacy merge RPC is blocked for client roles and privileged merge RPC is service-role only. |
| `verify-snapshot-pagination.sql` | Verifies `get_event_snapshot_by_shortcode` windowing metadata and pagination cursor behavior. |

**How to run:** Copy the SQL into [Supabase Dashboard → SQL Editor](https://supabase.com/dashboard) and execute.
