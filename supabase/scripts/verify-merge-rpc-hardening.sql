-- Verify merge RPC privilege hardening after migration 00027.

-- 1) Privilege matrix for legacy + privileged merge functions.
SELECT
  rp.routine_name,
  rp.grantee,
  rp.privilege_type
FROM information_schema.routine_privileges rp
WHERE rp.routine_schema = 'public'
  AND rp.routine_name IN (
    'merge_anonymous_identity',
    'merge_anonymous_identity_for_target'
  )
ORDER BY rp.routine_name, rp.grantee, rp.privilege_type;

-- 2) Explicit privilege assertions (expected booleans in comments).
SELECT
  has_function_privilege(
    'authenticated',
    'public.merge_anonymous_identity(uuid)',
    'EXECUTE'
  ) AS authenticated_can_call_legacy, -- expected: false
  has_function_privilege(
    'anon',
    'public.merge_anonymous_identity(uuid)',
    'EXECUTE'
  ) AS anon_can_call_legacy, -- expected: false
  has_function_privilege(
    'service_role',
    'public.merge_anonymous_identity_for_target(uuid,uuid)',
    'EXECUTE'
  ) AS service_role_can_call_privileged, -- expected: true
  has_function_privilege(
    'authenticated',
    'public.merge_anonymous_identity_for_target(uuid,uuid)',
    'EXECUTE'
  ) AS authenticated_can_call_privileged; -- expected: false

