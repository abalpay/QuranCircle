-- Isolated PostgreSQL regression: run only against the synthetic test database.
-- Transaction rolls back every fixture and role setting.
BEGIN;
INSERT INTO auth.users(id) VALUES ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222'),('66666666-6666-4666-8666-666666666666');
INSERT INTO events(id,name,short_code,created_by) VALUES ('33333333-3333-4333-8333-333333333333','Synthetic orphan','AUTHZTEST',NULL);
INSERT INTO khatms(id,event_id,khatm_number) VALUES ('44444444-4444-4444-8444-444444444444','33333333-3333-4333-8333-333333333333',1);
INSERT INTO juzs(id,khatm_id,juz_number,claimed_by_name,claimed_by_user_id,status,claimed_at) VALUES ('55555555-5555-4555-8555-555555555555','44444444-4444-4444-8444-444444444444',1,'Synthetic claimer','22222222-2222-4222-8222-222222222222','claimed',now());
DO $$
DECLARE fn text; actor text; expected_status text; denied boolean;
BEGIN
  FOREACH fn IN ARRAY ARRAY['unclaim_juz','unmark_juz_read','mark_juz_read','mark_juz_read_with_completion'] LOOP
    expected_status := CASE WHEN fn='unmark_juz_read' THEN 'read' ELSE 'claimed' END;
    UPDATE juzs SET status=expected_status, read_at=CASE WHEN expected_status='read' THEN now() ELSE NULL END, claimed_by_user_id='22222222-2222-4222-8222-222222222222',claimed_by_name='Synthetic claimer',claimed_at=now();
    PERFORM set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
    denied := false;
    BEGIN
      EXECUTE format('SELECT public.%I(%L,%L::uuid)',fn,'AUTHZTEST','55555555-5555-4555-8555-555555555555');
    EXCEPTION WHEN raise_exception THEN
      IF SQLERRM LIKE 'Only the claimer%' THEN denied:=true; ELSE RAISE; END IF;
    END;
    IF NOT denied THEN RAISE EXCEPTION 'Unauthorized caller accepted by %',fn; END IF;
    PERFORM set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
    EXECUTE format('SELECT public.%I(%L,%L::uuid)',fn,'AUTHZTEST','55555555-5555-4555-8555-555555555555');
    RAISE NOTICE 'PASS null creator: % rejects unrelated caller, permits claimer',fn;
  END LOOP;
  UPDATE events SET created_by='66666666-6666-4666-8666-666666666666';
  FOREACH fn IN ARRAY ARRAY['unclaim_juz','unmark_juz_read','mark_juz_read','mark_juz_read_with_completion'] LOOP
    expected_status := CASE WHEN fn='unmark_juz_read' THEN 'read' ELSE 'claimed' END;
    UPDATE juzs SET status=expected_status,read_at=CASE WHEN expected_status='read' THEN now() ELSE NULL END,claimed_by_user_id='22222222-2222-4222-8222-222222222222',claimed_by_name='Synthetic claimer',claimed_at=now();
    PERFORM set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
    denied:=false;
    BEGIN EXECUTE format('SELECT public.%I(%L,%L::uuid)',fn,'AUTHZTEST','55555555-5555-4555-8555-555555555555');
    EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'Only the claimer%' THEN denied:=true; ELSE RAISE; END IF; END;
    IF NOT denied THEN RAISE EXCEPTION 'Unrelated caller accepted with creator by %',fn; END IF;
    PERFORM set_config('request.jwt.claim.sub','66666666-6666-4666-8666-666666666666',true);
    UPDATE events SET is_archived=true;
    denied:=false;
    BEGIN EXECUTE format('SELECT public.%I(%L,%L::uuid)',fn,'AUTHZTEST','55555555-5555-4555-8555-555555555555');
    EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE '%archived%' THEN denied:=true; ELSE RAISE; END IF; END;
    IF NOT denied THEN RAISE EXCEPTION 'Archived mutation accepted by %',fn; END IF;
    UPDATE events SET is_archived=false;
    EXECUTE format('SELECT public.%I(%L,%L::uuid)',fn,'AUTHZTEST','55555555-5555-4555-8555-555555555555');
    PERFORM set_config('request.jwt.claim.sub','',true);
    denied:=false;
    BEGIN EXECUTE format('SELECT public.%I(%L,%L::uuid)',fn,'AUTHZTEST','55555555-5555-4555-8555-555555555555');
    EXCEPTION WHEN raise_exception THEN IF SQLERRM='Active session required' THEN denied:=true; ELSE RAISE; END IF; END;
    IF NOT denied THEN RAISE EXCEPTION 'Missing session accepted by %',fn; END IF;
    PERFORM set_config('request.jwt.claim.sub','66666666-6666-4666-8666-666666666666',true);
    denied:=false;
    BEGIN EXECUTE format('SELECT public.%I(%L,%L::uuid)',fn,'AUTHZTEST','77777777-7777-4777-8777-777777777777');
    EXCEPTION WHEN raise_exception THEN IF SQLERRM='Juz not found' THEN denied:=true; ELSE RAISE; END IF; END;
    IF NOT denied THEN RAISE EXCEPTION 'Missing row accepted by %',fn; END IF;
    RAISE NOTICE 'PASS creator/session/archive/missing row: %',fn;
  END LOOP;
END $$;
ROLLBACK;
