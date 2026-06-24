-- Proyección de aumento read-only para el portal del inquilino (un contrato propio).

BEGIN;

CREATE OR REPLACE FUNCTION public.calcular_proyeccion_aumento_portal(p_contrato_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inquilino_id bigint;
  r record;
  v_aumento_aplicado record;
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
BEGIN
  v_inquilino_id := public.obtener_inquilino_id();

  IF v_inquilino_id IS NULL THEN
    RETURN jsonb_build_object(
      'disponible', false,
      'motivo', 'sin_perfil_inquilino',
      'propuesta', null
    );
  END IF;

  SELECT
    c.id AS contrato_id,
    c.monto_alquiler,
    c.fecha_inicio,
    c.fecha_ultimo_aumento,
    c.fecha_proximo_aumento,
    c.fecha_fin,
    c.tipo_ajuste,
    c.periodicidad_meses,
    i.nombre_completo AS inquilino_nombre,
    p.direccion AS propiedad_direccion
  INTO r
  FROM public.contratos c
  INNER JOIN public.inquilinos i ON i.id = c.inquilino_id
  INNER JOIN public.propiedades p ON p.id = c.propiedad_id
  WHERE c.id = p_contrato_id
    AND c.inquilino_id = v_inquilino_id
    AND c.estado = 'activo'::public.contrato_estado;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'disponible', false,
      'motivo', 'contrato_no_encontrado',
      'propuesta', null
    );
  END IF;

  IF r.tipo_ajuste NOT IN ('icl'::public.tipo_ajuste_contrato, 'ipc'::public.tipo_ajuste_contrato) THEN
    RETURN jsonb_build_object(
      'disponible', false,
      'motivo', 'ajuste_no_indexado',
      'propuesta', null
    );
  END IF;

  IF r.fecha_proximo_aumento IS NULL OR r.fecha_proximo_aumento > r.fecha_fin THEN
    RETURN jsonb_build_object(
      'disponible', false,
      'motivo', 'sin_aumento_programado',
      'propuesta', null
    );
  END IF;

  SELECT a.monto_nuevo, a.fecha_aplicacion
  INTO v_aumento_aplicado
  FROM public.aumentos a
  WHERE a.contrato_id = r.contrato_id
    AND a.fecha_aplicacion = r.fecha_proximo_aumento
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'disponible', true,
      'motivo', null,
      'propuesta', jsonb_build_object(
        'contrato_id', r.contrato_id,
        'tipo_ajuste', r.tipo_ajuste::text,
        'inquilino_nombre', r.inquilino_nombre,
        'propiedad_direccion', r.propiedad_direccion,
        'monto_actual', r.monto_alquiler,
        'monto_propuesto', v_aumento_aplicado.monto_nuevo,
        'variacion_pct', CASE
          WHEN r.monto_alquiler > 0 THEN round(((v_aumento_aplicado.monto_nuevo / r.monto_alquiler) - 1) * 100, 2)
          ELSE NULL
        END,
        'fecha_desde', COALESCE(r.fecha_ultimo_aumento, r.fecha_inicio),
        'fecha_hasta', r.fecha_proximo_aumento,
        'fecha_proximo_aumento', r.fecha_proximo_aumento,
        'indice_tipo', r.tipo_ajuste::text,
        'estado', 'aplicado',
        'es_aproximado', false,
        'es_vencido', r.fecha_proximo_aumento <= CURRENT_DATE,
        'confirmable', false,
        'ya_aplicado', true
      )
    );
  END IF;

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
  END IF;

  RETURN jsonb_build_object(
    'disponible', true,
    'motivo', null,
    'propuesta', jsonb_build_object(
      'contrato_id', r.contrato_id,
      'tipo_ajuste', r.tipo_ajuste::text,
      'inquilino_nombre', r.inquilino_nombre,
      'propiedad_direccion', r.propiedad_direccion,
      'monto_actual', r.monto_alquiler,
      'monto_propuesto', v_monto_propuesto,
      'variacion_pct', v_variacion_pct,
      'fecha_desde', v_fecha_desde,
      'fecha_hasta', v_fecha_hasta,
      'fecha_proximo_aumento', r.fecha_proximo_aumento,
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
      'confirmable', v_es_vencido AND v_estado = 'ok' AND NOT v_ipc_aproximado,
      'ya_aplicado', false
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.calcular_proyeccion_aumento_portal(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calcular_proyeccion_aumento_portal(bigint) TO authenticated;

COMMIT;
