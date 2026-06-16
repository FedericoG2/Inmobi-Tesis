-- Fase 1: vigencia de contratos, estado unificado, cron programados, aumentos acotados al plazo.

BEGIN;

-- Corregir datos existentes con próximo aumento fuera de vigencia
UPDATE public.contratos
SET fecha_proximo_aumento = NULL
WHERE fecha_proximo_aumento IS NOT NULL
  AND fecha_proximo_aumento > fecha_fin;

-- ---------------------------------------------------------------------------
-- INSERT: validar que fecha_proximo_aumento no supere fecha_fin
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.bloquear_insert_contrato_propiedad_no_disponible()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.propiedades
    WHERE id = NEW.propiedad_id
      AND estado = 'Disponible'::public.propiedad_estado
  ) THEN
    RAISE EXCEPTION 'Solo se pueden crear contratos sobre propiedades disponibles'
      USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.contratos c
    WHERE c.propiedad_id = NEW.propiedad_id
      AND c.estado IN ('programado'::public.contrato_estado, 'activo'::public.contrato_estado)
      AND daterange(c.fecha_inicio, c.fecha_fin, '[]')
          && daterange(NEW.fecha_inicio, NEW.fecha_fin, '[]')
  ) THEN
    RAISE EXCEPTION 'Las fechas se solapan con otro contrato de esta propiedad'
      USING ERRCODE = 'P0001';
  END IF;

  IF NEW.fecha_proximo_aumento IS NOT NULL
     AND NEW.fecha_proximo_aumento > NEW.fecha_fin THEN
    RAISE EXCEPTION 'La fecha del proximo aumento no puede ser posterior al fin del contrato'
      USING ERRCODE = 'P0001';
  END IF;

  IF NEW.fecha_inicio > CURRENT_DATE THEN
    NEW.estado := 'programado'::public.contrato_estado;
    NEW.activo := false;
  ELSE
    NEW.estado := 'activo'::public.contrato_estado;
    NEW.activo := true;
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- calcular_aumentos_pendientes: estado activo + aumento dentro de vigencia
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

-- ---------------------------------------------------------------------------
-- confirmar_aumentos: estado activo + respetar fin de vigencia
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
-- KPIs dashboard: usar estado activo
-- ---------------------------------------------------------------------------

DROP VIEW IF EXISTS public.dashboard_admin_kpis;

CREATE VIEW public.dashboard_admin_kpis
WITH (security_invoker = true)
AS
SELECT
  (SELECT count(*) FROM public.propiedades) AS total_propiedades,
  (SELECT count(*) FROM public.contratos WHERE estado = 'activo'::public.contrato_estado) AS contratos_activos,
  (
    SELECT count(*)
    FROM public.reclamos
    WHERE estado = 'Pendiente'::public.reclamo_estado
  ) AS reclamos_pendientes,
  round(
    (
      SELECT count(*)
      FROM public.propiedades
      WHERE estado = 'Alquilada'::public.propiedad_estado
    )::numeric
    / NULLIF((SELECT count(*) FROM public.propiedades), 0)::numeric
    * 100::numeric,
    1
  ) AS porcentaje_ocupacion,
  (
    SELECT count(*)
    FROM public.contratos c
    WHERE c.estado = 'activo'::public.contrato_estado
      AND c.fecha_proximo_aumento IS NOT NULL
      AND c.fecha_proximo_aumento <= c.fecha_fin
      AND c.tipo_ajuste IN (
        'icl'::public.tipo_ajuste_contrato,
        'ipc'::public.tipo_ajuste_contrato
      )
      AND c.fecha_proximo_aumento >= CURRENT_DATE
      AND c.fecha_proximo_aumento <= CURRENT_DATE + 30
  ) AS contratos_aumento_30d,
  (
    SELECT count(*)
    FROM public.reclamos r
    WHERE r.prioridad = 'Urgente'::public.reclamo_prioridad
      AND r.estado <> 'Resuelto'::public.reclamo_estado
  ) AS reclamos_urgentes,
  (
    SELECT count(*)
    FROM public.contratos c
    WHERE c.estado = 'activo'::public.contrato_estado
      AND c.fecha_fin >= CURRENT_DATE
      AND c.fecha_fin <= CURRENT_DATE + 90
  ) AS contratos_por_vencer_90d;

GRANT SELECT ON public.dashboard_admin_kpis TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Cron diario: activar contratos programados (requiere extensión pg_cron)
-- ---------------------------------------------------------------------------

DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'activar-contratos-programados') THEN
      PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'activar-contratos-programados';
    END IF;

    PERFORM cron.schedule(
      'activar-contratos-programados',
      '5 3 * * *',
      $$SELECT public.activar_contratos_programados();$$
    );
  END IF;
EXCEPTION
  WHEN undefined_table OR undefined_object THEN
    RAISE NOTICE 'pg_cron no disponible: omitiendo programación de activar_contratos_programados';
END;
$cron$;

COMMIT;
