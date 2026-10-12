-- Run only in isolated synthetic test database.
BEGIN;
INSERT INTO auth.users(id) VALUES ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
DO $$
DECLARE event_record record; khatm_id uuid; result jsonb; rejected boolean; args text; i integer;
BEGIN
  FOREACH args IN ARRAY ARRAY[
    'repeat(''n'',201),null,false,''LONGNAME''',
    '''Name'',repeat(''d'',2001),false,''LONGDESC''',
    '''   '',null,false,''EMPTYNAME'''
  ] LOOP
    rejected:=false;
    BEGIN EXECUTE 'SELECT * FROM public.create_event_with_initial_khatm('||args||')';
    EXCEPTION WHEN raise_exception THEN rejected:=true; END;
    IF NOT rejected THEN RAISE EXCEPTION 'Oversized/blank event input accepted'; END IF;
  END LOOP;
  SELECT * INTO event_record FROM public.create_event_with_initial_khatm(repeat('n',200),repeat('d',2000),false,'LIMITTEST');
  SELECT id INTO khatm_id FROM public.khatms WHERE event_id=event_record.event_id;
  FOREACH args IN ARRAY ARRAY[
    'ARRAY[1],repeat(''n'',101)',
    'array_fill(1,ARRAY[31]),''Reader''',
    'ARRAY[]::int[],''Reader''',
    'NULL::int[],''Reader''',
    'ARRAY[1],''   '''
  ] LOOP
    rejected:=false;
    BEGIN EXECUTE format('SELECT public.claim_juz_batch(%L,%L::uuid,%s)','LIMITTEST',khatm_id,args);
    EXCEPTION WHEN raise_exception THEN rejected:=true; END;
    IF NOT rejected THEN RAISE EXCEPTION 'Invalid claim input accepted: %',args; END IF;
  END LOOP;
  result:=public.claim_juz_batch('LIMITTEST',khatm_id,ARRAY(SELECT generate_series(1,30)),repeat('r',100));
  IF jsonb_array_length(result->'claimed')<>30 THEN RAISE EXCEPTION 'Valid full batch rejected'; END IF;
  INSERT INTO public.khatms(event_id,khatm_number) SELECT event_record.event_id,generate_series(3,22);
  IF jsonb_array_length(public.get_event_snapshot_by_shortcode('LIMITTEST')->'khatms')<>3 THEN RAISE EXCEPTION 'Omitted snapshot limit unbounded'; END IF;
  IF jsonb_array_length(public.get_event_snapshot_by_shortcode('LIMITTEST',NULL)->'khatms')<>3 THEN RAISE EXCEPTION 'Null snapshot limit unbounded'; END IF;
  IF jsonb_array_length(public.get_event_snapshot_by_shortcode('LIMITTEST',999)->'khatms')<>20 THEN RAISE EXCEPTION 'Large snapshot limit unbounded'; END IF;
  IF (public.get_event_snapshot_by_shortcode('LIMITTEST',3,20)->>'next_before_khatm_number')::int<>17 THEN RAISE EXCEPTION 'Snapshot cursor regressed'; END IF;
  RAISE NOTICE 'PASS input boundaries, valid batch, bounded/null/cursor snapshots';
  FOR i IN 2..10 LOOP PERFORM public.create_event_with_initial_khatm('Rate test',null,false,'RATE'||i); END LOOP;
  rejected:=false;
  BEGIN PERFORM public.create_event_with_initial_khatm('Rate test',null,false,'RATE11');
  EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'Too many requests%' THEN rejected:=true; ELSE RAISE; END IF; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Creation rate limit failed'; END IF;
  -- Expiry and independent identity budget.
  UPDATE private.rpc_rate_limits SET window_started_at=now()-interval '2 hours' WHERE operation='create_event';
  PERFORM public.create_event_with_initial_khatm('After expiry',null,false,'RATEEXPIRY');
  PERFORM set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
  PERFORM public.create_event_with_initial_khatm('Independent budget',null,false,'RATEUSER2');
  FOR i IN 1..120 LOOP PERFORM public.ensure_event_membership('LIMITTEST'); END LOOP;
  rejected:=false;
  BEGIN PERFORM public.ensure_event_membership('LIMITTEST');
  EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'Too many requests%' THEN rejected:=true; ELSE RAISE; END IF; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Mutation rate limit failed'; END IF;
  IF has_function_privilege('authenticated','private.enforce_rpc_rate_limit(text)','EXECUTE') THEN RAISE EXCEPTION 'Private limiter exposed'; END IF;
  IF has_table_privilege('authenticated','private.rpc_rate_limits','UPDATE') THEN RAISE EXCEPTION 'Limiter table writable'; END IF;
  RAISE NOTICE 'PASS creation/mutation rate limits, reset, independent users, private grants';
END $$;
ROLLBACK;
