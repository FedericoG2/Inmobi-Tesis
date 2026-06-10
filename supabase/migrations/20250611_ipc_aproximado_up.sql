-- =============================================================================
-- INMOBI — IPC aproximado (calibración ARquiler)
-- Si faltan meses al final del período (aún no publicados), calcula con los
-- disponibles consecutivos desde el inicio y marca es_aproximado = true.
-- Falta índice solo si falta un mes intermedio o no hay ningún mes aplicable.
-- =============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.ipc_factor_periodo(date, date);

CREATE OR REPLACE FUNCTION public.ipc_factor_periodo(
  p_fecha_desde date,
  p_fecha_hasta date,
  OUT factor numeric,
  OUT meses_aplicados int,
  OUT meses_esperados int,
  OUT es_aproximado boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mes date;
  v_mes_fin date;
  v_temp date;
  v_var numeric;
  v_all_remaining_null boolean;
BEGIN
  factor := 1;
  meses_aplicados := 0;
  meses_esperados := 0;
  es_aproximado := false;

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

  v_temp := v_mes;
  WHILE v_temp <= v_mes_fin LOOP
    meses_esperados := meses_esperados + 1;
    v_temp := (v_temp + interval '1 month')::date;
  END LOOP;

  WHILE v_mes <= v_mes_fin LOOP
    v_var := public.ipc_variacion_en_mes(
      EXTRACT(YEAR FROM v_mes)::smallint,
      EXTRACT(MONTH FROM v_mes)::smallint
    );

    IF v_var IS NULL THEN
      v_all_remaining_null := true;
      v_temp := v_mes;

      WHILE v_temp <= v_mes_fin LOOP
        IF public.ipc_variacion_en_mes(
          EXTRACT(YEAR FROM v_temp)::smallint,
          EXTRACT(MONTH FROM v_temp)::smallint
        ) IS NOT NULL THEN
          v_all_remaining_null := false;
          EXIT;
        END IF;
        v_temp := (v_temp + interval '1 month')::date;
      END LOOP;

      IF v_all_remaining_null AND meses_aplicados > 0 THEN
        es_aproximado := true;
        EXIT;
      END IF;

      factor := NULL;
      meses_aplicados := 0;
      es_aproximado := false;
      RETURN;
    END IF;

    factor := factor * (1 + v_var / 100);
    meses_aplicados := meses_aplicados + 1;
    v_mes := (v_mes + interval '1 month')::date;
  END LOOP;

  es_aproximado := meses_aplicados < meses_esperados;
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
  v_ipc_meses_esperados int;
  v_ipc_aproximado boolean;
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
    v_ipc_meses_esperados := NULL;
    v_ipc_aproximado := false;

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
      SELECT f.factor, f.meses_aplicados, f.meses_esperados, f.es_aproximado
      INTO v_ipc_factor, v_ipc_meses, v_ipc_meses_esperados, v_ipc_aproximado
      FROM public.ipc_factor_periodo(v_fecha_desde, v_fecha_hasta) AS f;

      IF v_ipc_factor IS NULL OR v_ipc_meses = 0 THEN
        v_estado := 'falta_indice';
        v_monto_propuesto := NULL;
        v_variacion_pct := NULL;
        v_ipc_aproximado := false;
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
        'ipc_meses_esperados', v_ipc_meses_esperados,
        'ipc_factor', v_ipc_factor,
        'es_aproximado', v_ipc_aproximado,
        'modo', 'calculado',
        'estado', v_estado,
        'es_vencido', v_es_vencido,
        'confirmable', v_es_vencido AND v_estado = 'ok' AND NOT v_ipc_aproximado
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

CREATE OR REPLACE FUNCTION public.confirmar_aumentos(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  v_contrato public.contratos%ROWTYPE;
  v_fecha_aplicacion date;
  v_fecha_desde date;
  v_monto_nuevo numeric;
  v_modo text;
  v_indice_tipo public.indice_referencia;
  v_ipc_aproximado boolean;
  v_count int := 0;
  v_errors jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.es_admin() THEN
    RAISE EXCEPTION 'Solo administradores pueden confirmar aumentos' USING ERRCODE = 'P0001';
  END IF;

  IF payload IS NULL OR jsonb_typeof(payload) <> 'array' THEN
    RAISE EXCEPTION 'Payload invalido: se espera un array JSON' USING ERRCODE = 'P0001';
  END IF;

  FOR item IN SELECT t.value FROM jsonb_array_elements(payload) AS t(value)
  LOOP
    BEGIN
      SELECT * INTO v_contrato FROM public.contratos
      WHERE id = (item->>'contrato_id')::bigint FOR UPDATE;

      IF NOT FOUND THEN
        v_errors := v_errors || jsonb_build_object('contrato_id', item->>'contrato_id', 'error', 'Contrato no encontrado');
        CONTINUE;
      END IF;

      IF NOT v_contrato.activo THEN
        v_errors := v_errors || jsonb_build_object('contrato_id', v_contrato.id, 'error', 'El contrato no esta activo');
        CONTINUE;
      END IF;

      v_fecha_aplicacion := v_contrato.fecha_proximo_aumento;

      IF v_fecha_aplicacion IS NULL THEN
        v_errors := v_errors || jsonb_build_object('contrato_id', v_contrato.id, 'error', 'Sin fecha de proximo aumento');
        CONTINUE;
      END IF;

      IF v_fecha_aplicacion > CURRENT_DATE THEN
        v_errors := v_errors || jsonb_build_object('contrato_id', v_contrato.id, 'error', 'Aumento futuro: solo preview');
        CONTINUE;
      END IF;

      IF v_contrato.tipo_ajuste = 'ipc'::public.tipo_ajuste_contrato THEN
        v_fecha_desde := COALESCE(v_contrato.fecha_ultimo_aumento, v_contrato.fecha_inicio);
        SELECT f.es_aproximado INTO v_ipc_aproximado
        FROM public.ipc_factor_periodo(v_fecha_desde, v_fecha_aplicacion) AS f;

        IF v_ipc_aproximado IS NOT DISTINCT FROM true THEN
          v_errors := v_errors || jsonb_build_object(
            'contrato_id', v_contrato.id,
            'error', 'IPC incompleto: recalcule cuando se publiquen todos los meses del periodo'
          );
          CONTINUE;
        END IF;
      END IF;

      v_monto_nuevo := (item->>'monto_nuevo')::numeric;
      IF v_monto_nuevo IS NULL OR v_monto_nuevo < 0 THEN
        v_errors := v_errors || jsonb_build_object('contrato_id', v_contrato.id, 'error', 'Monto nuevo invalido');
        CONTINUE;
      END IF;

      v_modo := item->>'modo';
      IF v_modo IS NULL OR v_modo NOT IN ('calculado', 'manual', 'porcentaje_fijo') THEN
        v_errors := v_errors || jsonb_build_object('contrato_id', v_contrato.id, 'error', 'Modo invalido');
        CONTINUE;
      END IF;

      v_indice_tipo := NULL;
      IF COALESCE(item->>'indice_tipo', '') <> '' THEN
        v_indice_tipo := (item->>'indice_tipo')::public.indice_referencia;
      END IF;

      INSERT INTO public.aumentos (
        contrato_id, fecha_aplicacion, monto_anterior, monto_nuevo,
        porcentaje_aplicado, indice_tipo, indice_valor_inicio, indice_valor_fin, modo, notas
      ) VALUES (
        v_contrato.id, v_fecha_aplicacion, v_contrato.monto_alquiler, v_monto_nuevo,
        NULLIF(item->>'porcentaje_aplicado', '')::numeric,
        v_indice_tipo,
        NULLIF(item->>'indice_valor_inicio', '')::numeric,
        NULLIF(item->>'indice_valor_fin', '')::numeric,
        v_modo,
        NULLIF(trim(item->>'notas'), '')
      );

      UPDATE public.contratos SET
        monto_alquiler = v_monto_nuevo,
        fecha_ultimo_aumento = v_fecha_aplicacion,
        fecha_proximo_aumento = (v_fecha_aplicacion + (periodicidad_meses || ' months')::interval)::date,
        updated_at = now()
      WHERE id = v_contrato.id;

      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_object('contrato_id', item->>'contrato_id', 'error', SQLERRM);
    END;
  END LOOP;

  RETURN jsonb_build_object('confirmados', v_count, 'errores', v_errors);
END;
$$;

REVOKE ALL ON FUNCTION public.confirmar_aumentos(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirmar_aumentos(jsonb) TO authenticated;

COMMIT;
