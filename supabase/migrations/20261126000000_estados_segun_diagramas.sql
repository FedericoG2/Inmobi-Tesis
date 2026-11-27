-- =============================================================================
-- Estados según los diagramas de transición del documento (sección 10.k)
-- =============================================================================
-- La base rechaza las transiciones que los diagramas no tienen, además de la pantalla:
--   1) Reclamo: Pendiente → En Proceso → Revisión → Resuelto, de a un paso; un Resuelto solo
--      se reabre a En Proceso.
--   2) Contrato: Programado → Activo (al llegar la fecha de inicio) o Cancelado;
--      Activo → Finalizado o Rescindido. Finalizado, Rescindido y Cancelado son estados finales.
--   3) Propiedad: el usuario solo la pasa entre Disponible y Mantenimiento, y una propiedad nueva
--      se crea Disponible. Reservada y Alquilada las pone el sistema según el contrato.
--   4) La documentación de un contrato queda disponible en el portal del inquilino.
-- Las reglas 2 y 3 se aplican a los usuarios de la aplicación. Los scripts que corren en el SQL
-- Editor (sin usuario) quedan libres para armar escenarios de prueba.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Reclamo: un paso por vez
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
  v_siguiente public.reclamo_estado;
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
    IF p_estado_nuevo = 'Pendiente' THEN
      RAISE EXCEPTION 'Un reclamo no puede volver al estado Pendiente.';
    END IF;
    IF v_estado_actual = 'Resuelto' AND p_estado_nuevo <> 'En Proceso' THEN
      RAISE EXCEPTION 'Reabrir un reclamo resuelto lo deja en estado En Proceso.';
    END IF;

    v_siguiente := CASE v_estado_actual
      WHEN 'Pendiente' THEN 'En Proceso'
      WHEN 'En Proceso' THEN 'Revision'
      WHEN 'Revision' THEN 'Resuelto'
      WHEN 'Resuelto' THEN 'En Proceso'
    END::public.reclamo_estado;

    IF p_estado_nuevo <> v_siguiente THEN
      RAISE EXCEPTION 'Desde % el reclamo solo pasa a %. El camino es Pendiente, En Proceso, Revisión y Resuelto.',
        public.actividad_estado_reclamo(v_estado_actual::text), public.actividad_estado_reclamo(v_siguiente::text);
    END IF;

    PERFORM set_config('inmobi.gestion_reclamo', 'on', true);
    UPDATE public.reclamos SET estado = p_estado_nuevo WHERE id = p_reclamo_id;
    PERFORM set_config('inmobi.gestion_reclamo', 'off', true);

    INSERT INTO public.reclamo_eventos (reclamo_id, estado_anterior, estado_nuevo, comentario, creado_por)
    VALUES (p_reclamo_id, v_estado_actual, p_estado_nuevo, v_comentario, auth.uid())
    RETURNING * INTO v_evento;
  ELSE
    IF v_comentario IS NULL THEN
      RAISE EXCEPTION 'Escribí un comentario o elegí un estado distinto.';
    END IF;

    INSERT INTO public.reclamo_eventos (reclamo_id, estado_anterior, estado_nuevo, comentario, creado_por)
    VALUES (p_reclamo_id, v_estado_actual, NULL, v_comentario, auth.uid())
    RETURNING * INTO v_evento;
  END IF;

  RETURN v_evento;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2) Contrato: transiciones del diagrama y estados finales
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validar_transicion_contrato()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.estado IS NOT DISTINCT FROM OLD.estado OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF OLD.estado = 'inactivo'::public.contrato_estado THEN
    RAISE EXCEPTION 'Un contrato finalizado, rescindido o cancelado no cambia de estado'
      USING ERRCODE = 'P0001';
  END IF;

  IF OLD.estado = 'activo'::public.contrato_estado AND NEW.estado = 'programado'::public.contrato_estado THEN
    RAISE EXCEPTION 'Un contrato activo no vuelve a programado' USING ERRCODE = 'P0001';
  END IF;

  IF OLD.estado = 'programado'::public.contrato_estado
     AND NEW.estado = 'activo'::public.contrato_estado
     AND NEW.fecha_inicio > public.fecha_hoy_ar() THEN
    RAISE EXCEPTION 'Un contrato programado pasa a activo cuando llega su fecha de inicio'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contratos_validar_transicion ON public.contratos;
CREATE TRIGGER trg_contratos_validar_transicion
BEFORE UPDATE OF estado ON public.contratos
FOR EACH ROW EXECUTE FUNCTION public.validar_transicion_contrato();

-- ---------------------------------------------------------------------------
-- 3) Propiedad: Reservada y Alquilada solo las pone el sistema
-- ---------------------------------------------------------------------------
-- La sincronización marca que el cambio viene de un contrato; el resto de los cambios de estado
-- son manuales y solo van entre Disponible y Mantenimiento.
CREATE OR REPLACE FUNCTION public.sincronizar_estado_propiedad_por_contratos(p_propiedad_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_estado_actual public.propiedad_estado;
  v_estado_nuevo public.propiedad_estado;
BEGIN
  SELECT estado INTO v_estado_actual
  FROM public.propiedades
  WHERE id = p_propiedad_id;

  IF v_estado_actual = 'Mantenimiento'::public.propiedad_estado THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.contratos
    WHERE propiedad_id = p_propiedad_id AND estado = 'activo'::public.contrato_estado
  ) THEN
    v_estado_nuevo := 'Alquilada';
  ELSIF EXISTS (
    SELECT 1 FROM public.contratos
    WHERE propiedad_id = p_propiedad_id AND estado = 'programado'::public.contrato_estado
  ) THEN
    v_estado_nuevo := 'Reservada';
  ELSE
    v_estado_nuevo := 'Disponible';
  END IF;

  PERFORM set_config('inmobi.sincronizando_propiedad', 'on', true);
  UPDATE public.propiedades SET estado = v_estado_nuevo WHERE id = p_propiedad_id;
  PERFORM set_config('inmobi.sincronizando_propiedad', 'off', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sincronizar_estado_propiedad_por_contratos(bigint) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.bloquear_propiedad_estado_alquilada_manual()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sincronizando boolean := coalesce(current_setting('inmobi.sincronizando_propiedad', true), '') = 'on';
  v_manuales public.propiedad_estado[] := ARRAY['Disponible', 'Mantenimiento']::public.propiedad_estado[];
BEGIN
  IF TG_OP = 'INSERT' AND NEW.estado = 'Alquilada'::public.propiedad_estado THEN
    RAISE EXCEPTION 'Una propiedad nueva no puede crearse en estado Alquilada. Ese estado se asigna al vincular un contrato'
      USING ERRCODE = 'P0001';
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.estado = 'Alquilada'::public.propiedad_estado
     AND OLD.estado IS DISTINCT FROM 'Alquilada'::public.propiedad_estado
     AND NOT EXISTS (
       SELECT 1 FROM public.contratos
       WHERE propiedad_id = NEW.id AND estado = 'activo'::public.contrato_estado
     )
  THEN
    RAISE EXCEPTION 'El estado Alquilada solo puede asignarse al vincular un contrato activo'
      USING ERRCODE = 'P0001';
  END IF;

  -- Usuarios de la aplicación: estados manuales.
  IF auth.uid() IS NOT NULL AND NOT v_sincronizando THEN
    IF TG_OP = 'INSERT' AND NEW.estado <> 'Disponible'::public.propiedad_estado THEN
      RAISE EXCEPTION 'Una propiedad nueva se crea Disponible. Después se puede pasar a Mantenimiento'
        USING ERRCODE = 'P0001';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.estado IS DISTINCT FROM OLD.estado
       AND NOT (OLD.estado = ANY (v_manuales) AND NEW.estado = ANY (v_manuales)) THEN
      RAISE EXCEPTION 'El estado de la propiedad solo se cambia a mano entre Disponible y Mantenimiento. Reservada y Alquilada dependen del contrato'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4) Documentación del contrato: disponible en el portal del inquilino
-- ---------------------------------------------------------------------------
UPDATE public.documentos
SET visible_para_inquilino = true
WHERE contrato_id IS NOT NULL
  AND categoria::text = 'Contrato Firmado'
  AND visible_para_inquilino IS DISTINCT FROM true;

-- ---------------------------------------------------------------------------
-- 5) Imágenes del reclamo: el inquilino las adjunta al registrarlo o después
-- ---------------------------------------------------------------------------
-- Sumar imágenes se permite mientras el reclamo no esté Resuelto; quitarlas sigue siendo
-- modificar el reclamo, que el inquilino solo hace en Pendiente.
DROP POLICY IF EXISTS documentos_insert_adjunto_inquilino ON public.documentos;
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
        AND r.estado <> 'Resuelto'
    )
  );

DROP POLICY IF EXISTS contratos_storage_insert_adjunto_inquilino ON storage.objects;
CREATE POLICY contratos_storage_insert_adjunto_inquilino ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'contratos'
    AND (storage.foldername(name))[1] = 'reclamos'
    AND (storage.foldername(name))[2] IN (
      SELECT r.id::text FROM public.reclamos r
      WHERE r.inquilino_id = (SELECT public.obtener_inquilino_id())
        AND r.estado <> 'Resuelto'
    )
  );
