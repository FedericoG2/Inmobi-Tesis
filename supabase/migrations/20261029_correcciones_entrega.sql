-- Correcciones para que el sistema funcione como lo describe el informe.
--  1. Una cuenta creada sin rol no recibe ninguno: solo el Administrador de sistema asigna roles
--     (antes caía en 'inquilino' por defecto). Además hay que desactivar el registro público
--     en Supabase: Authentication > Sign In / Providers > "Allow new users to sign up".
--  2. Se da de baja la tarea diaria que aplicaba aumentos "programados": la función ya no existe.
--  3. Al deshacer un aumento se borra también la fila de su comprobante (antes quedaba
--     visible para el inquilino si fallaba la limpieza desde la pantalla).
--  4. Los indicadores del Dashboard usan la fecha de Argentina, igual que el resto de las reglas.
--  5. confirmar_aumentos rechaza un monto nuevo de cero.
--  6. El Administrador de sistema no lee las fichas de inquilinos: las cuentas se administran
--     con la función gestionar-cuentas (service role). Cada rol accede solo a lo que necesita.
--  7. Se quitan restos de versiones anteriores que el modelo de datos ya no tiene: la columna
--     contratos.activo (el estado vive en contratos.estado), la tabla indices (los índices se
--     consultan en vivo a Argly) y las funciones y vistas que dependían de ellas.

BEGIN;

-- 1. Alta de usuarios sin rol por defecto ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.raw_app_meta_data ->> 'rol' IN ('admin', 'encargado', 'inquilino') THEN
    INSERT INTO public.perfiles (id, rol)
    VALUES (NEW.id, (NEW.raw_app_meta_data ->> 'rol')::public.user_role)
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Tarea diaria huérfana ------------------------------------------------------------------
DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'aplicar-aumentos-programados';
  END IF;
END;
$cron$;

-- 3. El comprobante se borra con su aumento -------------------------------------------------
DO $fk$
DECLARE
  v_nombre text;
BEGIN
  SELECT con.conname INTO v_nombre
  FROM pg_constraint con
  JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
  WHERE con.conrelid = 'public.documentos'::regclass
    AND con.contype = 'f'
    AND att.attname = 'aumento_id';
  IF v_nombre IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.documentos DROP CONSTRAINT %I', v_nombre);
  END IF;
END;
$fk$;

ALTER TABLE public.documentos
  ADD CONSTRAINT documentos_aumento_id_fkey
  FOREIGN KEY (aumento_id) REFERENCES public.aumentos (id) ON DELETE CASCADE;

-- 4. Indicadores del Dashboard con la fecha de Argentina ------------------------------------
CREATE OR REPLACE VIEW public.dashboard_admin_kpis AS
SELECT
  (SELECT count(*) FROM propiedades) AS total_propiedades,
  (SELECT count(*) FROM contratos WHERE contratos.estado = 'activo'::contrato_estado) AS contratos_activos,
  (SELECT count(*) FROM reclamos WHERE reclamos.estado = 'Pendiente'::reclamo_estado) AS reclamos_pendientes,
  round(
    (SELECT count(*) FROM propiedades WHERE propiedades.estado = 'Alquilada'::propiedad_estado)::numeric
    / NULLIF((SELECT count(*) FROM propiedades), 0)::numeric * 100::numeric,
    1
  ) AS porcentaje_ocupacion,
  (SELECT count(*) FROM contratos c
    WHERE c.estado = 'activo'::contrato_estado
      AND c.fecha_proximo_aumento IS NOT NULL
      AND c.tipo_ajuste = ANY (ARRAY['icl'::tipo_ajuste_contrato, 'ipc'::tipo_ajuste_contrato])
      AND c.fecha_proximo_aumento >= public.fecha_hoy_ar()
      AND c.fecha_proximo_aumento <= public.fecha_hoy_ar() + 30) AS contratos_aumento_30d,
  (SELECT count(*) FROM reclamos r
    WHERE r.prioridad = 'Urgente'::reclamo_prioridad
      AND r.estado <> 'Resuelto'::reclamo_estado) AS reclamos_urgentes,
  (SELECT count(*) FROM contratos c
    WHERE c.estado = 'activo'::contrato_estado
      AND c.fecha_fin >= public.fecha_hoy_ar()
      AND c.fecha_fin <= public.fecha_hoy_ar() + 60) AS contratos_por_vencer_60d,
  (SELECT count(*) FROM contratos c
    WHERE c.estado = 'activo'::contrato_estado
      AND c.fecha_proximo_aumento IS NOT NULL
      AND c.tipo_ajuste = ANY (ARRAY['icl'::tipo_ajuste_contrato, 'ipc'::tipo_ajuste_contrato])
      AND c.fecha_proximo_aumento < public.fecha_hoy_ar()
      AND c.fecha_proximo_aumento <= c.fecha_fin) AS aumentos_vencidos;

CREATE OR REPLACE VIEW public.dashboard_contratos_por_vencer AS
SELECT
  c.id AS contrato_id,
  c.fecha_fin,
  c.fecha_fin - public.fecha_hoy_ar() AS dias_restantes,
  c.monto_alquiler,
  i.nombre_completo AS inquilino_nombre,
  p.direccion AS propiedad_direccion
FROM contratos c
JOIN inquilinos i ON i.id = c.inquilino_id
JOIN propiedades p ON p.id = c.propiedad_id
WHERE c.estado = 'activo'::contrato_estado
  AND c.fecha_fin >= public.fecha_hoy_ar()
  AND c.fecha_fin <= public.fecha_hoy_ar() + 60;

ALTER VIEW public.dashboard_admin_kpis SET (security_invoker = true);
ALTER VIEW public.dashboard_contratos_por_vencer SET (security_invoker = true);

-- 5. Monto nuevo mayor que cero ---------------------------------------------------------------
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
  v_detalle jsonb;
  v_count int := 0;
  v_errors jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.es_encargado() THEN
    RAISE EXCEPTION 'Solo el Encargado de Alquileres puede confirmar aumentos' USING ERRCODE = 'P0001';
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

      -- El aumento entra a la bandeja el día 11 de su mes.
      IF public.fecha_hoy_ar() < (date_trunc('month', v_fecha_aplicacion)::date + 10) THEN
        v_errors := v_errors || jsonb_build_object(
          'contrato_id', v_contrato.id,
          'error', 'El aumento se puede confirmar desde el dia 11 del mes de aumento'
        );
        CONTINUE;
      END IF;

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
      IF v_monto_nuevo IS NULL OR v_monto_nuevo <= 0 THEN
        v_errors := v_errors || jsonb_build_object('contrato_id', v_contrato.id, 'error', 'Monto nuevo invalido');
        CONTINUE;
      END IF;

      v_modo := item->>'modo';
      IF v_modo IS NULL OR v_modo NOT IN ('calculado', 'manual') THEN
        v_errors := v_errors || jsonb_build_object('contrato_id', v_contrato.id, 'error', 'Modo invalido');
        CONTINUE;
      END IF;

      v_indice_tipo := NULL;
      IF COALESCE(item->>'indice_tipo', '') <> '' THEN
        v_indice_tipo := (item->>'indice_tipo')::public.indice_referencia;
      END IF;

      v_fecha_desde := COALESCE(v_contrato.fecha_ultimo_aumento, v_contrato.fecha_inicio);

      IF item ? 'detalle_calculo' AND jsonb_typeof(item->'detalle_calculo') = 'object' THEN
        v_detalle := item->'detalle_calculo';
      ELSE
        v_detalle := jsonb_build_object(
          'tipo', v_contrato.tipo_ajuste::text,
          'icl_inicio', NULLIF(item->>'indice_valor_inicio', '')::numeric,
          'icl_fin', NULLIF(item->>'indice_valor_fin', '')::numeric
        );
      END IF;

      v_detalle := v_detalle || jsonb_build_object(
        'fecha_desde', COALESCE(v_detalle->>'fecha_desde', v_fecha_desde::text),
        'fecha_hasta', v_fecha_aplicacion,
        'monto_anterior', v_contrato.monto_alquiler,
        'monto_nuevo', v_monto_nuevo,
        'variacion_pct', NULLIF(item->>'porcentaje_aplicado', '')::numeric,
        'modo', v_modo,
        'indice_tipo', v_contrato.tipo_ajuste::text,
        'es_aproximado', COALESCE((v_detalle->>'es_aproximado')::boolean, false),
        'fuente', COALESCE(NULLIF(item->>'fuente', ''), NULLIF(v_detalle->>'fuente', ''), 'argly'),
        'confirmado_por', auth.uid(),
        'fecha_confirmacion', now()
      );
      v_detalle := v_detalle - 'programado';

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
        true
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

-- 6. Fichas de inquilinos: solo el Encargado (política aparte) y el propio inquilino -------------
DROP POLICY IF EXISTS inquilinos_select_propio_o_admin ON public.inquilinos;
CREATE POLICY inquilinos_select_propio ON public.inquilinos
  FOR SELECT TO authenticated
  USING (perfil_id = (SELECT auth.uid()));

-- 7. Restos de versiones anteriores ---------------------------------------------------------
DROP VIEW IF EXISTS public.dashboard_inquilino_resumen;
DROP VIEW IF EXISTS public.dashboard_ipc_anual;

DO $legado$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS firma
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'calcular_aumentos_pendientes',
        'calcular_proyeccion_aumento_portal',
        'icl_valor_en_fecha',
        'upsert_indices_icl_batch',
        'upsert_indices_ipc_batch'
      )
  LOOP
    EXECUTE format('DROP FUNCTION %s', r.firma);
  END LOOP;
END;
$legado$;

DROP TABLE IF EXISTS public.indices;

CREATE OR REPLACE FUNCTION public.activar_contratos_programados()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  r record;
BEGIN
  UPDATE public.contratos
  SET estado = 'activo'::public.contrato_estado
  WHERE estado = 'programado'::public.contrato_estado
    AND fecha_inicio <= public.fecha_hoy_ar();

  GET DIAGNOSTICS v_count = ROW_COUNT;

  FOR r IN
    SELECT DISTINCT propiedad_id
    FROM public.contratos
    WHERE estado = 'activo'::public.contrato_estado
      AND fecha_inicio <= public.fecha_hoy_ar()
  LOOP
    PERFORM public.sincronizar_estado_propiedad_por_contratos(r.propiedad_id);
  END LOOP;

  RETURN v_count;
END;
$$;

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

  IF NEW.fecha_inicio > public.fecha_hoy_ar() THEN
    NEW.estado := 'programado'::public.contrato_estado;
  ELSE
    NEW.estado := 'activo'::public.contrato_estado;
  END IF;

  RETURN NEW;
END;
$$;

-- Antes de quitar la columna, se frena todo si alguna función todavía la usa.
DO $activo$
DECLARE
  v_funciones text;
BEGIN
  SELECT string_agg(p.proname, ', ') INTO v_funciones
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosrc ~* '(\m(new|old|c)\.activo\M)|(\mactivo\s*:?=)';
  IF v_funciones IS NOT NULL THEN
    RAISE EXCEPTION 'Todavía usan contratos.activo: %', v_funciones;
  END IF;
END;
$activo$;

ALTER TABLE public.contratos DROP COLUMN IF EXISTS activo;

COMMIT;
