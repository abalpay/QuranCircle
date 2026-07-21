-- Adopt Supabase's October 2026 secure defaults now: future objects in public
-- are private until a migration explicitly opts each role into the exact access
-- it needs. RLS remains enabled and forced on every current application table.

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLES FROM PUBLIC, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE USAGE, SELECT, UPDATE
  ON SEQUENCES FROM PUBLIC, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated, service_role;

-- QuranCircle's browser/server clients use the allowlisted RPC surface rather
-- than direct table access. Remove legacy broad table grants from client roles.
REVOKE ALL ON TABLE
  public.events,
  public.khatms,
  public.juzs,
  public.bookmarks,
  public.event_members
FROM PUBLIC, anon, authenticated, service_role;

-- Trusted server-side maintenance and test fixtures require direct CRUD. This
-- key is never exposed to browser clients and continues to bypass RLS by design.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.events,
  public.khatms,
  public.juzs,
  public.bookmarks,
  public.event_members
TO service_role;
