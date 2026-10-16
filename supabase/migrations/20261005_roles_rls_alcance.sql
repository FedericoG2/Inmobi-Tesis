-- Alinea permisos y reglas de negocio con el alcance del informe (sección 1.3):
--   admin      = Administrador de sistema (solo cuentas; no opera la cartera)
--   encargado  = Encargado de Alquileres (cartera completa)
--   inquilino  = portal, solo datos propios (contratos vigentes y anteriores)

-- Hasta ahora "admin" operaba la cartera: esas cuentas pasan a ser Encargado de Alquileres.
UPDATE public.perfiles SET rol = 'encargado' WHERE rol = 'admin';

-- ---------------------------------------------------------------------------
-- Funciones de rol
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE id = (SELECT auth.uid()) AND rol = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.es_encargado()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE id = (SELECT auth.uid()) AND rol = 'encargado'
  );
$$;

CREATE OR REPLACE FUNCTION public.obtener_inquilino_id()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM public.inquilinos WHERE perfil_id = (SELECT auth.uid());
$$;

-- El rol inicial lo fija el Administrador de sistema vía app_metadata (solo editable con service role).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rol public.user_role := 'inquilino';
BEGIN
  IF NEW.raw_app_meta_data ->> 'rol' IN ('admin', 'encargado', 'inquilino') THEN
    v_rol := (NEW.raw_app_meta_data ->> 'rol')::public.user_role;
  END IF;

  INSERT INTO public.perfiles (id, rol) VALUES (NEW.id, v_rol);
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC de negocio: pasan a exigir rol encargado
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.gestionar_reclamo(
  p_reclamo_id bigint,
  p_estado_nuevo public.reclamo_estado DEFAULT NULL,
  p_comentario text DEFAULT NULL
)
RETURNS public.reclamo_eventos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_estado_actual public.reclamo_estado;
  v_comentario text;
  v_evento public.reclamo_eventos;
  v_cambia boolean;
BEGIN
  IF NOT public.es_encargado() THEN
    RAISE EXCEPTION 'Solo el Encargado de Alquileres puede gestionar reclamos.';
  END IF;

  SELECT estado INTO v_estado_actual
  FROM public.reclamos WHERE id = p_reclamo_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El reclamo no existe.';
  END IF;

  v_comentario := NULLIF(btrim(COALESCE(p_comentario, '')), '');
  v_cambia := p_estado_nuevo IS NOT NULL AND p_estado_nuevo <> v_estado_actual;

  IF v_cambia THEN
    IF p_estado_nuevo NOT IN ('En Proceso', 'Revision', 'Resuelto') THEN
      RAISE EXCEPTION 'Un reclamo no puede volver al estado Pendiente.';
    END IF;
    IF v_estado_actual = 'Resuelto' AND p_estado_nuevo <> 'En Proceso' THEN
      RAISE EXCEPTION 'Reabrir un reclamo resuelto lo deja en estado En Proceso.';
    END IF;

    PERFORM set_config('inmobi.gestion_reclamo', 'on', true);
    UPDATE public.reclamos SET estado = p_estado_nuevo WHERE id = p_reclamo_id;
    PERFORM set_config('inmobi.gestion_reclamo', 'off', true);

    INSERT INTO public.reclamo_eventos (reclamo_id, estado_anterior, estado_nuevo, comentario, creado_por)
    VALUES (p_reclamo_id, v_estado_actual, p_estado_nuevo, v_comentario, auth.uid())
    RETURNING * INTO v_evento;
  ELSE
    IF v_comentario IS NULL THEN
      RAISE EXCEPTION 'Escribi un comentario o eligi un estado distinto.';
    END IF;

    INSERT INTO public.reclamo_eventos (reclamo_id, estado_anterior, estado_nuevo, comentario, creado_por)
    VALUES (p_reclamo_id, v_estado_actual, NULL, v_comentario, auth.uid())
    RETURNING * INTO v_evento;
  END IF;

  RETURN v_evento;
END;
$$;

CREATE OR REPLACE FUNCTION public.deshacer_aumento(p_aumento_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_aumento public.aumentos%ROWTYPE;
  v_contrato_existe boolean;
  v_posteriores int;
  v_fecha_ultimo date;
  v_limite date;
BEGIN
  IF NOT public.es_encargado() THEN
    RAISE EXCEPTION 'Solo el Encargado de Alquileres puede deshacer aumentos' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_aumento FROM public.aumentos WHERE id = p_aumento_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aumento no encontrado' USING ERRCODE = 'P0001';
  END IF;

  v_limite := (date_trunc('month', v_aumento.fecha_aplicacion) + interval '1 month')::date + 9;

  IF public.fecha_hoy_ar() > v_limite THEN
    RAISE EXCEPTION 'El aumento ya quedo fijo. Se puede deshacer hasta el dia 10 del mes siguiente al mes de aumento'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*) INTO v_posteriores
  FROM public.aumentos a
  WHERE a.contrato_id = v_aumento.contrato_id
    AND a.id <> v_aumento.id
    AND a.fecha_aplicacion > v_aumento.fecha_aplicacion;

  IF v_posteriores > 0 THEN
    RAISE EXCEPTION 'Solo se puede deshacer el aumento mas reciente del contrato'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT max(a.fecha_aplicacion) INTO v_fecha_ultimo
  FROM public.aumentos a
  WHERE a.contrato_id = v_aumento.contrato_id
    AND a.id <> v_aumento.id
    AND a.fecha_aplicacion < v_aumento.fecha_aplicacion;

  SELECT EXISTS (SELECT 1 FROM public.contratos WHERE id = v_aumento.contrato_id)
  INTO v_contrato_existe;

  IF v_contrato_existe THEN
    UPDATE public.contratos SET
      monto_alquiler = v_aumento.monto_anterior,
      fecha_ultimo_aumento = v_fecha_ultimo,
      fecha_proximo_aumento = v_aumento.fecha_aplicacion,
      updated_at = now()
    WHERE id = v_aumento.contrato_id;
  END IF;

  DELETE FROM public.aumentos WHERE id = v_aumento.id;

  RETURN jsonb_build_object(
    'ok', true,
    'contrato_id', v_aumento.contrato_id,
    'monto_restaurado', v_aumento.monto_anterior
  );
END;
$$;

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
      IF v_monto_nuevo IS NULL OR v_monto_nuevo < 0 THEN
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

-- ---------------------------------------------------------------------------
-- Reglas de negocio con triggers
-- ---------------------------------------------------------------------------

-- Inquilinos: no se eliminan si tienen contratos (de cualquier estado) o reclamos.
CREATE OR REPLACE FUNCTION public.bloquear_delete_inquilino_con_contrato_activo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.contratos WHERE inquilino_id = OLD.id) THEN
    RAISE EXCEPTION 'No se puede eliminar el inquilino porque tiene contratos asociados'
      USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.reclamos WHERE inquilino_id = OLD.id) THEN
    RAISE EXCEPTION 'No se puede eliminar el inquilino porque tiene reclamos asociados'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN OLD;
END;
$$;

-- Inquilinos: si tiene o tuvo un contrato activo, no cambia tipo de persona ni documento.
CREATE OR REPLACE FUNCTION public.bloquear_cambio_identidad_inquilino()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.tipo_persona, NEW.dni_cuit) IS DISTINCT FROM (OLD.tipo_persona, OLD.dni_cuit)
     AND EXISTS (
       SELECT 1 FROM public.contratos c
       WHERE c.inquilino_id = OLD.id
         AND (c.estado = 'activo'
              OR (c.estado = 'inactivo' AND c.fecha_inicio <= public.fecha_hoy_ar()))
     ) THEN
    RAISE EXCEPTION 'El inquilino tiene o tuvo un contrato activo: no se puede cambiar el tipo de persona ni el DNI/CUIT'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inquilinos_bloquear_cambio_identidad ON public.inquilinos;
CREATE TRIGGER trg_inquilinos_bloquear_cambio_identidad
  BEFORE UPDATE OF tipo_persona, dni_cuit ON public.inquilinos
  FOR EACH ROW EXECUTE FUNCTION public.bloquear_cambio_identidad_inquilino();

-- Reclamos: nacen en Pendiente y solo con contrato activo del inquilino en esa propiedad.
CREATE OR REPLACE FUNCTION public.validar_reclamo_alta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.estado := 'Pendiente';
  IF NOT EXISTS (
    SELECT 1 FROM public.contratos c
    WHERE c.inquilino_id = NEW.inquilino_id
      AND c.propiedad_id = NEW.propiedad_id
      AND c.estado = 'activo'
  ) THEN
    RAISE EXCEPTION 'Solo se puede registrar un reclamo si el inquilino tiene un contrato activo en esa propiedad'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reclamos_validar_alta ON public.reclamos;
CREATE TRIGGER trg_reclamos_validar_alta
  BEFORE INSERT ON public.reclamos
  FOR EACH ROW EXECUTE FUNCTION public.validar_reclamo_alta();

-- Reclamos: el estado solo cambia desde la gestión; las partes del reclamo no se reasignan.
CREATE OR REPLACE FUNCTION public.validar_reclamo_modificacion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.estado IS DISTINCT FROM OLD.estado
     AND COALESCE(current_setting('inmobi.gestion_reclamo', true), '') <> 'on' THEN
    RAISE EXCEPTION 'El estado del reclamo solo se cambia desde la gestion'
      USING ERRCODE = 'P0001';
  END IF;
  IF (NEW.inquilino_id, NEW.propiedad_id, NEW.contrato_id)
     IS DISTINCT FROM (OLD.inquilino_id, OLD.propiedad_id, OLD.contrato_id) THEN
    RAISE EXCEPTION 'Solo se pueden modificar titulo, descripcion, categoria y prioridad'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reclamos_validar_modificacion ON public.reclamos;
CREATE TRIGGER trg_reclamos_validar_modificacion
  BEFORE UPDATE ON public.reclamos
  FOR EACH ROW EXECUTE FUNCTION public.validar_reclamo_modificacion();

-- Reclamos: un reclamo resuelto no se elimina (trazabilidad).
CREATE OR REPLACE FUNCTION public.bloquear_delete_reclamo_resuelto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.estado = 'Resuelto' THEN
    RAISE EXCEPTION 'Un reclamo resuelto no se puede eliminar'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_reclamos_bloquear_delete_resuelto ON public.reclamos;
CREATE TRIGGER trg_reclamos_bloquear_delete_resuelto
  BEFORE DELETE ON public.reclamos
  FOR EACH ROW EXECUTE FUNCTION public.bloquear_delete_reclamo_resuelto();

-- Adjuntos de reclamo: hasta 5 imágenes.
CREATE OR REPLACE FUNCTION public.validar_cantidad_adjuntos_reclamo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.reclamo_id IS NOT NULL AND (
    SELECT count(*) FROM public.documentos WHERE reclamo_id = NEW.reclamo_id
  ) >= 5 THEN
    RAISE EXCEPTION 'Un reclamo admite hasta 5 imagenes'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_documentos_validar_adjuntos_reclamo ON public.documentos;
CREATE TRIGGER trg_documentos_validar_adjuntos_reclamo
  BEFORE INSERT ON public.documentos
  FOR EACH ROW EXECUTE FUNCTION public.validar_cantidad_adjuntos_reclamo();

-- ---------------------------------------------------------------------------
-- Políticas RLS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin CRUD total / Inquilino solo ve su perfil" ON public.perfiles;
DROP POLICY IF EXISTS "Admin CRUD total / Inquilino ve su ficha comercial" ON public.inquilinos;
DROP POLICY IF EXISTS "Admin CRUD total propietarios" ON public.propietarios;
DROP POLICY IF EXISTS "Admin CRUD total / Inquilino ve su propiedad vinculada" ON public.propiedades;
DROP POLICY IF EXISTS "Admin CRUD total / Inquilino ve su contrato activo" ON public.contratos;
DROP POLICY IF EXISTS "Admin CRUD total / Inquilino ve aumentos de su contrato activo" ON public.aumentos;
DROP POLICY IF EXISTS "Solo Admin gestiona documentos" ON public.documentos;
DROP POLICY IF EXISTS "Admin ve todo / Inquilino ve documentos permitidos" ON public.documentos;
DROP POLICY IF EXISTS "Solo Admin borra reclamos" ON public.reclamos;
DROP POLICY IF EXISTS "Inquilino puede insertar reclamos en su propiedad activa" ON public.reclamos;
DROP POLICY IF EXISTS "Permitir inserción de reclamos" ON public.reclamos;
DROP POLICY IF EXISTS "Admin ve todo / Inquilino ve sus propios reclamos" ON public.reclamos;
DROP POLICY IF EXISTS "Admin modifica todo / Inquilino edita solo si esta Pendiente" ON public.reclamos;
DROP POLICY IF EXISTS "Admin gestiona eventos de reclamos" ON public.reclamo_eventos;

-- Perfiles: lectura propia; el Administrador de sistema ve todos. Las escrituras van por la Edge Function.
CREATE POLICY perfiles_select ON public.perfiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) OR public.es_admin());

-- Inquilinos
CREATE POLICY inquilinos_encargado ON public.inquilinos
  FOR ALL TO authenticated
  USING (public.es_encargado()) WITH CHECK (public.es_encargado());
CREATE POLICY inquilinos_select_propio_o_admin ON public.inquilinos
  FOR SELECT TO authenticated
  USING (perfil_id = (SELECT auth.uid()) OR public.es_admin());

-- Propietarios
CREATE POLICY propietarios_encargado ON public.propietarios
  FOR ALL TO authenticated
  USING (public.es_encargado()) WITH CHECK (public.es_encargado());

-- Propiedades
CREATE POLICY propiedades_encargado ON public.propiedades
  FOR ALL TO authenticated
  USING (public.es_encargado()) WITH CHECK (public.es_encargado());
CREATE POLICY propiedades_select_inquilino ON public.propiedades
  FOR SELECT TO authenticated
  USING (id IN (
    SELECT c.propiedad_id FROM public.contratos c
    WHERE c.inquilino_id = (SELECT public.obtener_inquilino_id())
      AND c.estado <> 'programado'
  ));

-- Contratos: el inquilino ve los vigentes y los anteriores.
CREATE POLICY contratos_encargado ON public.contratos
  FOR ALL TO authenticated
  USING (public.es_encargado()) WITH CHECK (public.es_encargado());
CREATE POLICY contratos_select_inquilino ON public.contratos
  FOR SELECT TO authenticated
  USING (
    inquilino_id = (SELECT public.obtener_inquilino_id())
    AND estado <> 'programado'
  );

-- Aumentos
CREATE POLICY aumentos_encargado ON public.aumentos
  FOR ALL TO authenticated
  USING (public.es_encargado()) WITH CHECK (public.es_encargado());
CREATE POLICY aumentos_select_inquilino ON public.aumentos
  FOR SELECT TO authenticated
  USING (contrato_id IN (
    SELECT c.id FROM public.contratos c
    WHERE c.inquilino_id = (SELECT public.obtener_inquilino_id())
      AND c.estado <> 'programado'
  ));

-- Documentos
CREATE POLICY documentos_encargado ON public.documentos
  FOR ALL TO authenticated
  USING (public.es_encargado()) WITH CHECK (public.es_encargado());
CREATE POLICY documentos_select_inquilino ON public.documentos
  FOR SELECT TO authenticated
  USING (
    (visible_para_inquilino AND contrato_id IN (
      SELECT c.id FROM public.contratos c
      WHERE c.inquilino_id = (SELECT public.obtener_inquilino_id())
        AND c.estado <> 'programado'
    ))
    OR reclamo_id IN (
      SELECT r.id FROM public.reclamos r
      WHERE r.inquilino_id = (SELECT public.obtener_inquilino_id())
    )
  );
CREATE POLICY documentos_insert_adjunto_inquilino ON public.documentos
  FOR INSERT TO authenticated
  WITH CHECK (
    categoria = 'Adjunto de Reclamo'
    AND contrato_id IS NULL
    AND aumento_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.reclamos r
      WHERE r.id = reclamo_id
        AND r.propiedad_id = documentos.propiedad_id
        AND r.inquilino_id = (SELECT public.obtener_inquilino_id())
        AND r.estado = 'Pendiente'
    )
  );
CREATE POLICY documentos_delete_adjunto_inquilino ON public.documentos
  FOR DELETE TO authenticated
  USING (
    categoria = 'Adjunto de Reclamo'
    AND reclamo_id IN (
      SELECT r.id FROM public.reclamos r
      WHERE r.inquilino_id = (SELECT public.obtener_inquilino_id())
        AND r.estado = 'Pendiente'
    )
  );

-- Reclamos
CREATE POLICY reclamos_encargado_select ON public.reclamos
  FOR SELECT TO authenticated
  USING (public.es_encargado());
CREATE POLICY reclamos_encargado_insert ON public.reclamos
  FOR INSERT TO authenticated
  WITH CHECK (public.es_encargado());
CREATE POLICY reclamos_encargado_update ON public.reclamos
  FOR UPDATE TO authenticated
  USING (public.es_encargado()) WITH CHECK (public.es_encargado());
CREATE POLICY reclamos_encargado_delete ON public.reclamos
  FOR DELETE TO authenticated
  USING (public.es_encargado() AND estado <> 'Resuelto');

CREATE POLICY reclamos_inquilino_select ON public.reclamos
  FOR SELECT TO authenticated
  USING (inquilino_id = (SELECT public.obtener_inquilino_id()));
CREATE POLICY reclamos_inquilino_insert ON public.reclamos
  FOR INSERT TO authenticated
  WITH CHECK (
    inquilino_id = (SELECT public.obtener_inquilino_id())
    AND propiedad_id IN (
      SELECT c.propiedad_id FROM public.contratos c
      WHERE c.inquilino_id = (SELECT public.obtener_inquilino_id())
        AND c.estado = 'activo'
    )
  );
CREATE POLICY reclamos_inquilino_update ON public.reclamos
  FOR UPDATE TO authenticated
  USING (inquilino_id = (SELECT public.obtener_inquilino_id()) AND estado = 'Pendiente')
  WITH CHECK (inquilino_id = (SELECT public.obtener_inquilino_id()) AND estado = 'Pendiente');
CREATE POLICY reclamos_inquilino_delete ON public.reclamos
  FOR DELETE TO authenticated
  USING (inquilino_id = (SELECT public.obtener_inquilino_id()) AND estado = 'Pendiente');

-- Seguimiento de reclamos: el inquilino consulta el historial de los suyos.
CREATE POLICY reclamo_eventos_encargado ON public.reclamo_eventos
  FOR ALL TO authenticated
  USING (public.es_encargado()) WITH CHECK (public.es_encargado());
CREATE POLICY reclamo_eventos_select_inquilino ON public.reclamo_eventos
  FOR SELECT TO authenticated
  USING (reclamo_id IN (
    SELECT r.id FROM public.reclamos r
    WHERE r.inquilino_id = (SELECT public.obtener_inquilino_id())
  ));

-- Storage (bucket privado "contratos")
DROP POLICY IF EXISTS "Admin gestiona archivos contratos" ON storage.objects;
DROP POLICY IF EXISTS "Inquilino descarga documentos visibles" ON storage.objects;

CREATE POLICY contratos_storage_encargado ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'contratos' AND public.es_encargado())
  WITH CHECK (bucket_id = 'contratos' AND public.es_encargado());

CREATE POLICY contratos_storage_select_inquilino ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'contratos'
    AND EXISTS (
      SELECT 1 FROM public.documentos d
      WHERE d.url_archivo = objects.name
        AND (
          (d.visible_para_inquilino AND d.contrato_id IN (
            SELECT c.id FROM public.contratos c
            WHERE c.inquilino_id = (SELECT public.obtener_inquilino_id())
              AND c.estado <> 'programado'
          ))
          OR d.reclamo_id IN (
            SELECT r.id FROM public.reclamos r
            WHERE r.inquilino_id = (SELECT public.obtener_inquilino_id())
          )
        )
    )
  );

CREATE POLICY contratos_storage_insert_adjunto_inquilino ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'contratos'
    AND (storage.foldername(name))[1] = 'reclamos'
    AND (storage.foldername(name))[2] IN (
      SELECT r.id::text FROM public.reclamos r
      WHERE r.inquilino_id = (SELECT public.obtener_inquilino_id())
        AND r.estado = 'Pendiente'
    )
  );

CREATE POLICY contratos_storage_delete_adjunto_inquilino ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'contratos'
    AND (storage.foldername(name))[1] = 'reclamos'
    AND (storage.foldername(name))[2] IN (
      SELECT r.id::text FROM public.reclamos r
      WHERE r.inquilino_id = (SELECT public.obtener_inquilino_id())
        AND r.estado = 'Pendiente'
    )
  );

-- ---------------------------------------------------------------------------
-- Vistas del dashboard: respetan RLS del usuario y no se exponen sin sesión
-- ---------------------------------------------------------------------------
ALTER VIEW public.dashboard_admin_kpis SET (security_invoker = true);
ALTER VIEW public.dashboard_admin_reclamos_urgentes SET (security_invoker = true);
ALTER VIEW public.dashboard_admin_aumentos_proximos SET (security_invoker = true);
ALTER VIEW public.dashboard_admin_aumentos_vencidos SET (security_invoker = true);
ALTER VIEW public.dashboard_contratos_por_vencer SET (security_invoker = true);
ALTER VIEW public.dashboard_propiedades_por_estado SET (security_invoker = true);

-- ---------------------------------------------------------------------------
-- Privilegios: nada para anon; perfiles solo lectura para la app
-- ---------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.perfiles FROM authenticated;

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM authenticated;
GRANT EXECUTE ON FUNCTION
  public.es_admin(),
  public.es_encargado(),
  public.obtener_inquilino_id(),
  public.fecha_hoy_ar(),
  public.confirmar_aumentos(jsonb),
  public.deshacer_aumento(bigint),
  public.gestionar_reclamo(bigint, public.reclamo_estado, text),
  public.activar_contratos_programados(),
  public.aplicar_aumentos_programados(),
  public.sincronizar_estado_propiedad_por_contratos(bigint),
  public.ipc_detalle_periodo(date, date),
  public.ipc_variacion_en_mes(smallint, smallint)
TO authenticated;
