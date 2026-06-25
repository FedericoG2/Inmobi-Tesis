-- =============================================================================
-- INMOBI — Aumentos Fase 2: confirmación libre + snapshot del cálculo
-- 1) aumentos.detalle_calculo: snapshot congelado del cálculo al confirmar.
-- 2) confirmar_aumentos: permite confirmar valores aproximados (como la
--    calculadora oficial) y guarda el snapshot. El monto confirmado queda fijo.
-- 3) calcular_aumentos_pendientes: 'confirmable' ahora habilita también los
--    aproximados (siguen marcados como tales para mostrar la advertencia).
-- Se mantiene: no se confirman aumentos con fecha futura.
-- =============================================================================

BEGIN;

ALTER TABLE public.aumentos
  ADD COLUMN IF NOT EXISTS detalle_calculo jsonb;

COMMENT ON COLUMN public.aumentos.detalle_calculo IS
  'Snapshot inmutable del cálculo al confirmar (índices, factor, meses, fórmula, fuente).';

-- ---------------------------------------------------------------------------
-- confirmar_aumentos: permite aproximado + guarda snapshot
-- ---------------------------------------------------------------------------
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
  v_fecha_siguiente date;
  v_monto_nuevo numeric;
  v_modo text;
  v_indice_tipo public.indice_referencia;
  v_icl_inicio numeric;
  v_icl_fin numeric;
  v_ipc_factor numeric;
  v_ipc_meses int;
  v_ipc_meses_esperados int;
  v_es_aproximado boolean;
  v_ipc_detalle jsonb;
  v_detalle jsonb;
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

      IF v_contrato.estado IS DISTINCT FROM 'activo'::public.contrato_estado THEN
        v_errors := v_errors || jsonb_build_object('contrato_id', v_contrato.id, 'error', 'El contrato no esta activo');
        CONTINUE;
      END IF;

      v_fecha_aplicacion := v_contrato.fecha_proximo_aumento;

      IF v_fecha_aplicacion IS NULL THEN
        v_errors := v_errors || jsonb_build_object('contrato_id', v_contrato.id, 'error', 'Sin fecha de proximo aumento');
        CONTINUE;
      END IF;

      IF v_fecha_aplicacion > v_contrato.fecha_fin THEN
        v_errors := v_errors || jsonb_build_object(
          'contrato_id', v_contrato.id,
          'error', 'La fecha del aumento supera el fin del contrato'
        );
        CONTINUE;
      END IF;

      IF v_fecha_aplicacion > CURRENT_DATE THEN
        v_errors := v_errors || jsonb_build_object('contrato_id', v_contrato.id, 'error', 'Aumento futuro: solo preview');
        CONTINUE;
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

      -- --- Snapshot del cálculo (recalculado server-side para que sea fiel) ---
      v_fecha_desde := COALESCE(v_contrato.fecha_ultimo_aumento, v_contrato.fecha_inicio);
      v_icl_inicio := NULL;
      v_icl_fin := NULL;
      v_ipc_factor := NULL;
      v_ipc_meses := NULL;
      v_ipc_meses_esperados := NULL;
      v_es_aproximado := false;
      v_ipc_detalle := NULL;

      IF v_contrato.tipo_ajuste = 'icl'::public.tipo_ajuste_contrato THEN
        v_icl_inicio := public.icl_valor_en_fecha(v_fecha_desde);
        v_icl_fin := public.icl_valor_en_fecha(v_fecha_aplicacion);
        v_es_aproximado := (v_icl_inicio IS NOT NULL AND v_icl_fin IS NOT NULL) AND NOT EXISTS (
          SELECT 1 FROM public.indices i
          WHERE i.indice = 'icl'::public.indice_referencia
            AND i.fecha IS NOT NULL
            AND i.fecha >= v_fecha_aplicacion
        );
        v_detalle := jsonb_build_object(
          'tipo', 'icl',
          'icl_inicio', v_icl_inicio,
          'icl_fin', v_icl_fin,
          'proporcion', CASE WHEN v_icl_inicio IS NOT NULL AND v_icl_inicio <> 0
            THEN round(v_icl_fin / v_icl_inicio, 6) ELSE NULL END
        );
      ELSIF v_contrato.tipo_ajuste = 'ipc'::public.tipo_ajuste_contrato THEN
        SELECT f.factor, f.meses_aplicados, f.meses_esperados, f.es_aproximado
        INTO v_ipc_factor, v_ipc_meses, v_ipc_meses_esperados, v_es_aproximado
        FROM public.ipc_factor_periodo(v_fecha_desde, v_fecha_aplicacion) AS f;
        v_ipc_detalle := public.ipc_detalle_periodo(v_fecha_desde, v_fecha_aplicacion);
        v_detalle := jsonb_build_object(
          'tipo', 'ipc',
          'factor', v_ipc_factor,
          'meses_aplicados', v_ipc_meses,
          'meses_esperados', v_ipc_meses_esperados,
          'detalle_meses', v_ipc_detalle
        );
      ELSE
        v_detalle := jsonb_build_object('tipo', v_contrato.tipo_ajuste::text);
      END IF;

      v_detalle := v_detalle || jsonb_build_object(
        'fecha_desde', v_fecha_desde,
        'fecha_hasta', v_fecha_aplicacion,
        'monto_anterior', v_contrato.monto_alquiler,
        'monto_nuevo', v_monto_nuevo,
        'variacion_pct', NULLIF(item->>'porcentaje_aplicado', '')::numeric,
        'modo', v_modo,
        'indice_tipo', v_contrato.tipo_ajuste::text,
        'es_aproximado', COALESCE(v_es_aproximado, false),
        'fuente', 'argly',
        'confirmado_por', auth.uid(),
        'fecha_confirmacion', now()
      );

      INSERT INTO public.aumentos (
        contrato_id, fecha_aplicacion, monto_anterior, monto_nuevo,
        porcentaje_aplicado, indice_tipo, indice_valor_inicio, indice_valor_fin,
        modo, notas, detalle_calculo
      ) VALUES (
        v_contrato.id, v_fecha_aplicacion, v_contrato.monto_alquiler, v_monto_nuevo,
        NULLIF(item->>'porcentaje_aplicado', '')::numeric,
        v_indice_tipo,
        NULLIF(item->>'indice_valor_inicio', '')::numeric,
        NULLIF(item->>'indice_valor_fin', '')::numeric,
        v_modo,
        NULLIF(trim(item->>'notas'), ''),
        v_detalle
      );

      v_fecha_siguiente := (v_fecha_aplicacion + (v_contrato.periodicidad_meses || ' months')::interval)::date;

      UPDATE public.contratos SET
        monto_alquiler = v_monto_nuevo,
        fecha_ultimo_aumento = v_fecha_aplicacion,
        fecha_proximo_aumento = CASE
          WHEN v_fecha_siguiente > fecha_fin THEN NULL
          ELSE v_fecha_siguiente
        END,
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

-- ---------------------------------------------------------------------------
-- calcular_aumentos_pendientes: confirmable habilita aproximados
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
        -- Fase 2: confirmable habilita también aproximados (vencido + con monto).
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
