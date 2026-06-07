-- Contrato: anular (DELETE) solo si está inactivo y sin movimientos asociados.
-- Alineado con front: contratosService.js, useContratos.js, AdminContratos.jsx

BEGIN;

CREATE OR REPLACE FUNCTION public.bloquear_delete_contrato_con_movimientos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.activo THEN
    RAISE EXCEPTION 'No se puede anular un contrato activo. Finalizalo primero.'
      USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.aumentos WHERE contrato_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'No se puede anular el contrato porque tiene movimientos asociados'
      USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.reclamos
    WHERE inquilino_id = OLD.inquilino_id
      AND propiedad_id = OLD.propiedad_id
  ) THEN
    RAISE EXCEPTION 'No se puede anular el contrato porque tiene movimientos asociados'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_contratos_bloquear_delete_con_movimientos ON public.contratos;
CREATE TRIGGER trg_contratos_bloquear_delete_con_movimientos
  BEFORE DELETE ON public.contratos
  FOR EACH ROW
  EXECUTE FUNCTION public.bloquear_delete_contrato_con_movimientos();

COMMIT;
