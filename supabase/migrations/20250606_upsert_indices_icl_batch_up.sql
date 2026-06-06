-- UPSERT batch ICL para Edge Function sync-argly-icl
BEGIN;

CREATE OR REPLACE FUNCTION public.upsert_indices_icl_batch(rows jsonb)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  item jsonb;
  v_fecha date;
  v_valor numeric;
BEGIN
  IF rows IS NULL OR jsonb_typeof(rows) <> 'array' THEN
    RAISE EXCEPTION 'Se espera un array JSON' USING ERRCODE = 'P0001';
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(rows) AS t(value)
  LOOP
    v_fecha := (item->>'fecha')::date;
    v_valor := (item->>'valor')::numeric;

    IF v_fecha IS NULL OR v_valor IS NULL OR v_valor <= 0 THEN
      CONTINUE;
    END IF;

    INSERT INTO public.indices (indice, fecha, valor, fuente, fecha_sync)
    VALUES ('icl'::public.indice_referencia, v_fecha, v_valor, COALESCE(item->>'fuente', 'argly'), now())
    ON CONFLICT (indice, fecha) WHERE fecha IS NOT NULL
    DO UPDATE SET
      valor = EXCLUDED.valor,
      fuente = EXCLUDED.fuente,
      fecha_sync = now();

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_indices_icl_batch(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_indices_icl_batch(jsonb) TO service_role;

COMMIT;
