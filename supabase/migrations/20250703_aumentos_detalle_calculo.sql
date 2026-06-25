-- =============================================================================
-- INMOBI — Detalle de cálculo de aumentos (Fase 1)
-- 1) ipc_detalle_periodo: desglose mes a mes del IPC del período.
-- 2) calcular_aumentos_pendientes: agrega 'ipc_detalle' y marca 'es_aproximado'
--    también para ICL cuando aún no se publicó el valor de la fecha de cierre.
-- Cambio aditivo: NO altera la regla de 'confirmable' vigente.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- ipc_detalle_periodo: array de meses { anio, mes, variacion_pct, publicado }
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ipc_detalle_periodo(
  p_fecha_desde date,
  p_fecha_hasta date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mes date;
  v_mes_fin date;
  v_var numeric;
  v_detalle jsonb := '[]'::jsonb;
BEGIN
  IF p_fecha_desde IS NULL OR p_fecha_hasta IS NULL OR p_fecha_hasta <= p_fecha_desde THEN
    RETURN v_detalle;
  END IF;

  v_mes := date_trunc('month', p_fecha_desde)::date;
  v_mes_fin := (date_trunc('month', p_fecha_hasta) - interval '1 month')::date;

  WHILE v_mes <= v_mes_fin LOOP
    v_var := public.ipc_variacion_en_mes(
      EXTRACT(YEAR FROM v_mes)::smallint,
      EXTRACT(MONTH FROM v_mes)::smallint
    );

    v_detalle := v_detalle || jsonb_build_array(
      jsonb_build_object(
        'anio', EXTRACT(YEAR FROM v_mes)::int,
        'mes', EXTRACT(MONTH FROM v_mes)::int,
        'variacion_pct', v_var,
        'publicado', v_var IS NOT NULL
      )
    );

    v_mes := (v_mes + interval '1 month')::date;
  END LOOP;

  RETURN v_detalle;
END;
$$;

REVOKE ALL ON FUNCTION public.ipc_detalle_periodo(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ipc_detalle_periodo(date, date) TO authenticated;

-- ---------------------------------------------------------------------------
-- calcular_aumentos_pendientes: + ipc_detalle, + es_aproximado para ICL
-- ---------------------------------------------------------------------------
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
  v_es_aproximado boolean;
  v_ipc_detalle jsonb;
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
    WHERE c.estado = 'activo'::public.contrato_estado
      AND c.tipo_ajuste IN ('icl'::public.tipo_ajuste_contrato, 'ipc'::public.tipo_ajuste_contrato)
      AND c.fecha_proximo_aumento IS NOT NULL
      AND c.fecha_proximo_aumento <= c.fecha_fin
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
    v_es_aproximado := false;
    v_ipc_detalle := NULL;

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
        -- Aproximado si aún no hay un ICL publicado para la fecha de cierre (o posterior):
        -- icl_valor_en_fecha devolvió el último valor anterior disponible.
        v_es_aproximado := NOT EXISTS (
          SELECT 1 FROM public.indices i
          WHERE i.indice = 'icl'::public.indice_referencia
            AND i.fecha IS NOT NULL
            AND i.fecha >= v_fecha_hasta
        );
      END IF;

    ELSIF r.tipo_ajuste = 'ipc'::public.tipo_ajuste_contrato THEN
      SELECT f.factor, f.meses_aplicados, f.meses_esperados, f.es_aproximado
      INTO v_ipc_factor, v_ipc_meses, v_ipc_meses_esperados, v_es_aproximado
      FROM public.ipc_factor_periodo(v_fecha_desde, v_fecha_hasta) AS f;

      v_ipc_detalle := public.ipc_detalle_periodo(v_fecha_desde, v_fecha_hasta);

      IF v_ipc_factor IS NULL OR v_ipc_meses = 0 THEN
        v_estado := 'falta_indice';
        v_monto_propuesto := NULL;
        v_variacion_pct := NULL;
        v_es_aproximado := false;
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
        'ipc_detalle', v_ipc_detalle,
        'es_aproximado', v_es_aproximado,
        'modo', 'calculado',
        'estado', v_estado,
        'es_vencido', v_es_vencido,
        -- Regla vigente: ICL aproximado sigue siendo confirmable; IPC aproximado no.
        'confirmable', v_es_vencido
          AND v_estado = 'ok'
          AND NOT (r.tipo_ajuste = 'ipc'::public.tipo_ajuste_contrato AND v_es_aproximado)
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
