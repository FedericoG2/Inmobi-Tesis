-- =============================================================================
-- INMOBI — IPC en módulo aumentos (UP)
-- upsert_indices_ipc_batch | ipc_factor_periodo | calcular extendido ICL+IPC
-- Calibración IPC: mes de fecha_desde .. mes anterior a fecha_hasta (compuesto).
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.upsert_indices_ipc_batch(rows jsonb)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  item jsonb;
  v_anio smallint;
  v_mes smallint;
  v_valor numeric;
BEGIN
  IF rows IS NULL OR jsonb_typeof(rows) <> 'array' THEN
    RAISE EXCEPTION 'Se espera un array JSON' USING ERRCODE = 'P0001';
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(rows) AS t(value)
  LOOP
    v_anio := (item->>'anio')::smallint;
    v_mes := (item->>'mes')::smallint;
    v_valor := (item->>'valor')::numeric;

    IF v_anio IS NULL OR v_mes IS NULL OR v_mes NOT BETWEEN 1 AND 12 OR v_valor IS NULL OR v_valor <= 0 THEN
      CONTINUE;
    END IF;

    INSERT INTO public.indices (indice, anio, mes, valor, fuente, fecha_sync)
    VALUES ('ipc'::public.indice_referencia, v_anio, v_mes, v_valor, COALESCE(item->>'fuente', 'argly'), now())
    ON CONFLICT (indice, anio, mes) WHERE anio IS NOT NULL
    DO UPDATE SET
      valor = EXCLUDED.valor,
      fuente = EXCLUDED.fuente,
      fecha_sync = now();

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_indices_ipc_batch(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_indices_ipc_batch(jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.ipc_variacion_en_mes(p_anio smallint, p_mes smallint)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.valor
  FROM public.indices i
  WHERE i.indice = 'ipc'::public.indice_referencia
    AND i.anio = p_anio
    AND i.mes = p_mes;
$$;

REVOKE ALL ON FUNCTION public.ipc_variacion_en_mes(smallint, smallint) FROM PUBLIC;

-- Factor compuesto IPC del período (NULL si falta algún mes).
-- Período: mes calendario de p_fecha_desde .. mes anterior a p_fecha_hasta (inclusive).
CREATE OR REPLACE FUNCTION public.ipc_factor_periodo(
  p_fecha_desde date,
  p_fecha_hasta date,
  OUT factor numeric,
  OUT meses_aplicados int
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mes date;
  v_mes_fin date;
  v_var numeric;
BEGIN
  factor := 1;
  meses_aplicados := 0;

  IF p_fecha_desde IS NULL OR p_fecha_hasta IS NULL OR p_fecha_hasta <= p_fecha_desde THEN
    factor := NULL;
    RETURN;
  END IF;

  v_mes := date_trunc('month', p_fecha_desde)::date;
  v_mes_fin := (date_trunc('month', p_fecha_hasta) - interval '1 month')::date;

  IF v_mes > v_mes_fin THEN
    factor := NULL;
    RETURN;
  END IF;

  WHILE v_mes <= v_mes_fin LOOP
    v_var := public.ipc_variacion_en_mes(
      EXTRACT(YEAR FROM v_mes)::smallint,
      EXTRACT(MONTH FROM v_mes)::smallint
    );

    IF v_var IS NULL THEN
      factor := NULL;
      meses_aplicados := 0;
      RETURN;
    END IF;

    factor := factor * (1 + v_var / 100);
    meses_aplicados := meses_aplicados + 1;
    v_mes := (v_mes + interval '1 month')::date;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.ipc_factor_periodo(date, date) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.calcular_aumentos_pendientes(
  incluir_proximos boolean DEFAULT false,
  dias_proximos int DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_fecha_desde date;
  v_fecha_hasta date;
  v_icl_inicio numeric;
  v_icl_fin numeric;
  v_ipc_factor numeric;
  v_ipc_meses int;
  v_monto_propuesto numeric;
  v_variacion_pct numeric;
  v_es_vencido boolean;
  v_estado text;
  v_propuestas jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.es_admin() THEN
    RAISE EXCEPTION 'Solo administradores pueden calcular aumentos pendientes'
      USING ERRCODE = 'P0001';
  END IF;

  IF dias_proximos IS NULL OR dias_proximos < 0 THEN
    RAISE EXCEPTION 'dias_proximos invalido' USING ERRCODE = 'P0001';
  END IF;

  FOR r IN
    SELECT
      c.id AS contrato_id,
      c.monto_alquiler,
      c.fecha_inicio,
      c.fecha_ultimo_aumento,
      c.fecha_proximo_aumento,
      c.tipo_ajuste,
      i.nombre_completo AS inquilino_nombre,
      p.direccion AS propiedad_direccion
    FROM public.contratos c
    INNER JOIN public.inquilinos i ON i.id = c.inquilino_id
    INNER JOIN public.propiedades p ON p.id = c.propiedad_id
    WHERE c.activo = true
      AND c.tipo_ajuste IN ('icl'::public.tipo_ajuste_contrato, 'ipc'::public.tipo_ajuste_contrato)
      AND c.fecha_proximo_aumento IS NOT NULL
      AND (
        c.fecha_proximo_aumento <= CURRENT_DATE
        OR (
          incluir_proximos
          AND c.fecha_proximo_aumento <= CURRENT_DATE + dias_proximos
        )
      )
    ORDER BY c.fecha_proximo_aumento ASC, c.id ASC
  LOOP
    v_fecha_desde := COALESCE(r.fecha_ultimo_aumento, r.fecha_inicio);
    v_fecha_hasta := r.fecha_proximo_aumento;
    v_es_vencido := v_fecha_hasta <= CURRENT_DATE;
    v_icl_inicio := NULL;
    v_icl_fin := NULL;
    v_ipc_factor := NULL;
    v_ipc_meses := NULL;

    IF r.tipo_ajuste = 'icl'::public.tipo_ajuste_contrato THEN
      v_icl_inicio := public.icl_valor_en_fecha(v_fecha_desde);
      v_icl_fin := public.icl_valor_en_fecha(v_fecha_hasta);

      IF v_icl_inicio IS NULL OR v_icl_fin IS NULL OR v_icl_inicio <= 0 THEN
        v_estado := 'falta_indice';
        v_monto_propuesto := NULL;
        v_variacion_pct := NULL;
      ELSE
        v_estado := 'ok';
        v_monto_propuesto := round(r.monto_alquiler * v_icl_fin / v_icl_inicio);
        v_variacion_pct := round(((v_icl_fin / v_icl_inicio) - 1) * 100, 2);
      END IF;

    ELSIF r.tipo_ajuste = 'ipc'::public.tipo_ajuste_contrato THEN
      SELECT f.factor, f.meses_aplicados
      INTO v_ipc_factor, v_ipc_meses
      FROM public.ipc_factor_periodo(v_fecha_desde, v_fecha_hasta) AS f;

      IF v_ipc_factor IS NULL OR v_ipc_meses = 0 THEN
        v_estado := 'falta_indice';
        v_monto_propuesto := NULL;
        v_variacion_pct := NULL;
      ELSE
        v_estado := 'ok';
        v_monto_propuesto := round(r.monto_alquiler * v_ipc_factor);
        v_variacion_pct := round((v_ipc_factor - 1) * 100, 2);
      END IF;

    ELSE
      CONTINUE;
    END IF;

    v_propuestas := v_propuestas || jsonb_build_array(
      jsonb_build_object(
        'contrato_id', r.contrato_id,
        'tipo_ajuste', r.tipo_ajuste::text,
        'inquilino_nombre', r.inquilino_nombre,
        'propiedad_direccion', r.propiedad_direccion,
        'monto_actual', r.monto_alquiler,
        'monto_propuesto', v_monto_propuesto,
        'variacion_pct', v_variacion_pct,
        'fecha_desde', v_fecha_desde,
        'fecha_hasta', v_fecha_hasta,
        'indice_tipo', r.tipo_ajuste::text,
        'indice_valor_inicio', v_icl_inicio,
        'indice_valor_fin', v_icl_fin,
        'ipc_meses', v_ipc_meses,
        'ipc_factor', v_ipc_factor,
        'modo', 'calculado',
        'estado', v_estado,
        'es_vencido', v_es_vencido,
        'confirmable', v_es_vencido AND v_estado = 'ok'
      )
    );
  END LOOP;

  RETURN jsonb_build_object(
    'propuestas', v_propuestas,
    'total', jsonb_array_length(v_propuestas),
    'fecha_calculo', CURRENT_DATE
  );
END;
$$;

REVOKE ALL ON FUNCTION public.calcular_aumentos_pendientes(boolean, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calcular_aumentos_pendientes(boolean, int) TO authenticated;

COMMIT;
