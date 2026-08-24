-- Deshacer solo si el aumento todavía no rige (acordado a futuro).
-- Alineado al alcance: una vez actualizado el alquiler, no se puede deshacer.

CREATE OR REPLACE FUNCTION public.deshacer_aumento(p_aumento_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_aumento public.aumentos%ROWTYPE;
BEGIN
  IF NOT public.es_admin() THEN
    RAISE EXCEPTION 'Solo administradores pueden deshacer aumentos' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_aumento FROM public.aumentos WHERE id = p_aumento_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aumento no encontrado' USING ERRCODE = 'P0001';
  END IF;

  IF v_aumento.aplicado THEN
    RAISE EXCEPTION 'Solo se puede deshacer un aumento que todavía no se aplicó'
      USING ERRCODE = 'P0001';
  END IF;

  DELETE FROM public.aumentos WHERE id = v_aumento.id;

  RETURN jsonb_build_object(
    'ok', true,
    'contrato_id', v_aumento.contrato_id,
    'aplicado', false,
    'monto_restaurado', v_aumento.monto_anterior
  );
END;
$$;

REVOKE ALL ON FUNCTION public.deshacer_aumento(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deshacer_aumento(bigint) TO authenticated;
