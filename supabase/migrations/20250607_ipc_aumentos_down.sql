-- =============================================================================
-- INMOBI — IPC en módulo aumentos (DOWN) — restaura calcular solo ICL
-- =============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.ipc_factor_periodo(date, date);
DROP FUNCTION IF EXISTS public.ipc_variacion_en_mes(smallint, smallint);
DROP FUNCTION IF EXISTS public.upsert_indices_ipc_batch(jsonb);

-- Restaurar calcular_aumentos_pendientes versión solo ICL (20250606)
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
      i.nombre_completo AS inquilino_nombre,
      p.direccion AS propiedad_direccion
    FROM public.contratos c
    INNER JOIN public.inquilinos i ON i.id = c.inquilino_id
    INNER JOIN public.propiedades p ON p.id = c.propiedad_id
    WHERE c.activo = true
      AND c.tipo_ajuste = 'icl'::public.tipo_ajuste_contrato
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

    v_propuestas := v_propuestas || jsonb_build_array(
      jsonb_build_object(
        'contrato_id', r.contrato_id,
        'inquilino_nombre', r.inquilino_nombre,
        'propiedad_direccion', r.propiedad_direccion,
        'monto_actual', r.monto_alquiler,
        'monto_propuesto', v_monto_propuesto,
        'variacion_pct', v_variacion_pct,
        'fecha_desde', v_fecha_desde,
        'fecha_hasta', v_fecha_hasta,
        'indice_tipo', 'icl',
        'indice_valor_inicio', v_icl_inicio,
        'indice_valor_fin', v_icl_fin,
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
