-- =============================================================================
-- INMOBI — Aumentos Fase 3a: confirmación anticipada (acordado/programado)
-- Objetivo: el admin puede confirmar/acordar un aumento ANTES de su fecha.
--   - Si la fecha ya llegó  -> se aplica al contrato (como hasta ahora).
--   - Si la fecha es futura  -> queda "acordado/programado": se registra el
--     aumento (con snapshot) pero el alquiler vigente NO cambia hasta la fecha.
--   - Una tarea diaria (y un fallback "al acceder") aplica los programados
--     cuando llega la fecha.
--   - El portal del inquilino muestra el aumento acordado por adelantado.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) aumentos.aplicado: false = acordado/programado (todavía no rige).
--    Las filas históricas quedan en true (ya estaban aplicadas al confirmar).
-- ---------------------------------------------------------------------------
ALTER TABLE public.aumentos
  ADD COLUMN IF NOT EXISTS aplicado boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.aumentos.aplicado IS
  'false = aumento acordado/programado a futuro (no rige aún); true = ya aplicado al contrato.';

-- ---------------------------------------------------------------------------
-- 2) aplicar_aumentos_programados(): aplica los acordados cuya fecha ya llegó.
--    Idempotente. La invoca el cron diario y el frontend al cargar.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aplicar_aumentos_programados()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a record;
  v_contrato public.contratos%ROWTYPE;
  v_fecha_siguiente date;
  v_count integer := 0;
BEGIN
  FOR a IN
    SELECT au.id, au.contrato_id, au.fecha_aplicacion, au.monto_nuevo
    FROM public.aumentos au
    WHERE au.aplicado = false
      AND au.fecha_aplicacion <= CURRENT_DATE
    ORDER BY au.fecha_aplicacion ASC, au.id ASC
  LOOP
    BEGIN
      SELECT * INTO v_contrato FROM public.contratos
      WHERE id = a.contrato_id FOR UPDATE;

      IF NOT FOUND THEN
        UPDATE public.aumentos SET aplicado = true WHERE id = a.id;
        CONTINUE;
      END IF;

      v_fecha_siguiente := (a.fecha_aplicacion
        + (v_contrato.periodicidad_meses || ' months')::interval)::date;

      UPDATE public.contratos SET
        monto_alquiler = a.monto_nuevo,
        fecha_ultimo_aumento = a.fecha_aplicacion,
        fecha_proximo_aumento = CASE
          WHEN v_fecha_siguiente > fecha_fin THEN NULL
          ELSE v_fecha_siguiente
        END,
        updated_at = now()
      WHERE id = v_contrato.id;

      UPDATE public.aumentos SET aplicado = true WHERE id = a.id;
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- No abortamos el lote por un contrato problemático.
      NULL;
    END;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.aplicar_aumentos_programados() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aplicar_aumentos_programados() TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) confirmar_aumentos: permite confirmar anticipado.
--    Fecha futura -> queda programado (aplicado=false), no toca el contrato.
--    Fecha llegada -> aplica como hasta ahora.
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
  v_es_programado boolean;
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

      -- Evitar acordar dos veces el mismo aumento.
      IF EXISTS (
        SELECT 1 FROM public.aumentos a
        WHERE a.contrato_id = v_contrato.id
          AND a.fecha_aplicacion = v_fecha_aplicacion
      ) THEN
        v_errors := v_errors || jsonb_build_object(
          'contrato_id', v_contrato.id,
          'error', 'Ya hay un aumento registrado para esta fecha'
        );
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

      v_es_programado := v_fecha_aplicacion > CURRENT_DATE;

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
        'programado', v_es_programado,
        'fuente', 'argly',
        'confirmado_por', auth.uid(),
        'fecha_confirmacion', now()
      );

      INSERT INTO public.aumentos (
        contrato_id, fecha_aplicacion, monto_anterior, monto_nuevo,
        porcentaje_aplicado, indice_tipo, indice_valor_inicio, indice_valor_fin,
        modo, notas, detalle_calculo, aplicado
      ) VALUES (
        v_contrato.id, v_fecha_aplicacion, v_contrato.monto_alquiler, v_monto_nuevo,
        NULLIF(item->>'porcentaje_aplicado', '')::numeric,
        v_indice_tipo,
        NULLIF(item->>'indice_valor_inicio', '')::numeric,
        NULLIF(item->>'indice_valor_fin', '')::numeric,
        v_modo,
        NULLIF(trim(item->>'notas'), ''),
        v_detalle,
        NOT v_es_programado
      );

      -- Solo se actualiza el contrato si el aumento ya rige (fecha llegada).
      IF NOT v_es_programado THEN
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
      END IF;

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
-- 4) calcular_aumentos_pendientes:
--    - confirmable ahora habilita también los anticipados (futuros con monto).
--    - detecta aumentos ya acordados (programados) y los marca como tales.
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
  v_acordado boolean;
  v_acordado_monto numeric;
  v_acordado_aprox boolean;
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

    -- ¿Ya hay un aumento acordado (programado) para esta fecha?
    SELECT a.monto_nuevo, COALESCE((a.detalle_calculo->>'es_aproximado')::boolean, false)
    INTO v_acordado_monto, v_acordado_aprox
    FROM public.aumentos a
    WHERE a.contrato_id = r.contrato_id
      AND a.fecha_aplicacion = r.fecha_proximo_aumento
      AND a.aplicado = false
    LIMIT 1;
    v_acordado := FOUND;

    IF v_acordado THEN
      v_monto_propuesto := v_acordado_monto;
      v_es_aproximado := COALESCE(v_acordado_aprox, false);
      IF r.monto_alquiler IS NOT NULL AND r.monto_alquiler > 0 THEN
        v_variacion_pct := round(((v_acordado_monto / r.monto_alquiler) - 1) * 100, 2);
      END IF;
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
        'ya_acordado', v_acordado,
        'programado', v_acordado,
        'monto_acordado', v_acordado_monto,
        -- Fase 3a: confirmable habilita anticipados (con monto) y excluye lo ya acordado.
        'confirmable', v_estado = 'ok' AND NOT v_acordado
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

-- ---------------------------------------------------------------------------
-- 5) calcular_proyeccion_aumento_portal: distinguir acordado (programado)
--    de ya aplicado, para mostrarle al inquilino el aumento por adelantado.
-- ---------------------------------------------------------------------------
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
  v_monto_acordado numeric;
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
  v_aplicado boolean;
  v_aprox_snapshot boolean;
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

  SELECT a.monto_nuevo, a.aplicado,
         COALESCE((a.detalle_calculo->>'es_aproximado')::boolean, false)
  INTO v_monto_acordado, v_aplicado, v_aprox_snapshot
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
        'monto_propuesto', v_monto_acordado,
        'variacion_pct', CASE
          WHEN r.monto_alquiler > 0 THEN round(((v_monto_acordado / r.monto_alquiler) - 1) * 100, 2)
          ELSE NULL
        END,
        'fecha_desde', COALESCE(r.fecha_ultimo_aumento, r.fecha_inicio),
        'fecha_hasta', r.fecha_proximo_aumento,
        'fecha_proximo_aumento', r.fecha_proximo_aumento,
        'indice_tipo', r.tipo_ajuste::text,
        'estado', CASE WHEN v_aplicado THEN 'aplicado' ELSE 'programado' END,
        'es_aproximado', v_aprox_snapshot,
        'es_vencido', r.fecha_proximo_aumento <= CURRENT_DATE,
        'confirmable', false,
        'programado', NOT v_aplicado,
        'ya_acordado', NOT v_aplicado,
        'ya_aplicado', v_aplicado
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

-- ---------------------------------------------------------------------------
-- 6) Cron diario: aplicar aumentos programados (requiere extensión pg_cron)
-- ---------------------------------------------------------------------------
DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'aplicar-aumentos-programados') THEN
      PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'aplicar-aumentos-programados';
    END IF;

    PERFORM cron.schedule(
      'aplicar-aumentos-programados',
      '10 3 * * *',
      $$SELECT public.aplicar_aumentos_programados();$$
    );
  END IF;
EXCEPTION
  WHEN undefined_table OR undefined_object THEN
    RAISE NOTICE 'pg_cron no disponible: omitiendo programación de aplicar_aumentos_programados';
END;
$cron$;

COMMIT;
