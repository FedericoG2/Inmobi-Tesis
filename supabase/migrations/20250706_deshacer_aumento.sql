-- =============================================================================
-- INMOBI — Deshacer aumento (admin)
-- Permite revertir un aumento desde el panel:
--   - Acordado a futuro (aplicado=false): solo se elimina el registro; el
--     contrato nunca se modificó, así que no hay nada que revertir.
--   - Ya aplicado (aplicado=true): se revierte el contrato (monto, fechas) y
--     se elimina el registro. Por seguridad SOLO se permite deshacer el último
--     aumento del contrato (no puede haber aumentos posteriores).
-- El comprobante PDF asociado se borra desde el servicio (storage + documento).
-- =============================================================================

BEGIN;

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
BEGIN
  IF NOT public.es_admin() THEN
    RAISE EXCEPTION 'Solo administradores pueden deshacer aumentos' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_aumento FROM public.aumentos WHERE id = p_aumento_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aumento no encontrado' USING ERRCODE = 'P0001';
  END IF;

  IF v_aumento.aplicado THEN
    -- No permitir deshacer un aumento intermedio: rompería la cadena de fechas/montos.
    SELECT count(*) INTO v_posteriores
    FROM public.aumentos a
    WHERE a.contrato_id = v_aumento.contrato_id
      AND a.id <> v_aumento.id
      AND a.fecha_aplicacion > v_aumento.fecha_aplicacion;

    IF v_posteriores > 0 THEN
      RAISE EXCEPTION 'Solo se puede deshacer el aumento más reciente del contrato'
        USING ERRCODE = 'P0001';
    END IF;

    -- Fecha del aumento aplicado inmediatamente anterior (para restaurar
    -- fecha_ultimo_aumento). NULL si este era el primero.
    SELECT max(a.fecha_aplicacion) INTO v_fecha_ultimo
    FROM public.aumentos a
    WHERE a.contrato_id = v_aumento.contrato_id
      AND a.aplicado = true
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
  END IF;

  DELETE FROM public.aumentos WHERE id = v_aumento.id;

  RETURN jsonb_build_object(
    'ok', true,
    'contrato_id', v_aumento.contrato_id,
    'aplicado', v_aumento.aplicado,
    'monto_restaurado', v_aumento.monto_anterior
  );
END;
$$;

REVOKE ALL ON FUNCTION public.deshacer_aumento(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deshacer_aumento(bigint) TO authenticated;

COMMIT;
