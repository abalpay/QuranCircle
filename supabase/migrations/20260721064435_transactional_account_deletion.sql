-- Keep account cleanup and auth.users deletion in the same database transaction.
-- A BEFORE DELETE trigger is required because the juz ownership foreign key uses
-- ON DELETE SET NULL, while the juz state constraint requires all claim fields to
-- be cleared together.

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.cleanup_user_data_before_auth_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.juzs
  SET
    claimed_by_name = NULL,
    claimed_by_user_id = NULL,
    status = 'unclaimed',
    claimed_at = NULL,
    read_at = NULL
  WHERE claimed_by_user_id = OLD.id;

  DELETE FROM public.bookmarks
  WHERE user_id = OLD.id;

  UPDATE public.events
  SET created_by = NULL
  WHERE created_by = OLD.id;

  DELETE FROM public.event_members
  WHERE user_id = OLD.id;

  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION private.cleanup_user_data_before_auth_delete()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS cleanup_user_data_before_auth_delete ON auth.users;

CREATE TRIGGER cleanup_user_data_before_auth_delete
BEFORE DELETE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION private.cleanup_user_data_before_auth_delete();

-- Keep the currently deployed application compatible while the database
-- migration and the new application version roll out independently. The old
-- application calls this RPC immediately before auth.admin.deleteUser(). It
-- must therefore succeed without mutating data; the trigger above performs the
-- real cleanup atomically when auth.users is deleted.
CREATE OR REPLACE FUNCTION public.cleanup_current_user_data()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.current_auth_is_non_anonymous() THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.cleanup_current_user_data() IS
  'Temporary rollout compatibility shim. Account cleanup occurs in the auth.users BEFORE DELETE trigger.';

REVOKE ALL ON FUNCTION public.cleanup_current_user_data()
  FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.cleanup_current_user_data()
  TO authenticated;
