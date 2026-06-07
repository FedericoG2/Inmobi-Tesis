-- Contrato: solo INSERT si la propiedad está Disponible y sin otro contrato activo.
-- Alineado con front: contratosService.crearContrato, ContratoFormModal.jsx

BEGIN;

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
    FROM public.contratos
    WHERE propiedad_id = NEW.propiedad_id
      AND activo = true
  ) THEN
    RAISE EXCEPTION 'Esta propiedad ya tiene un contrato activo'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contratos_bloquear_insert_propiedad_no_disponible ON public.contratos;
CREATE TRIGGER trg_contratos_bloquear_insert_propiedad_no_disponible
  BEFORE INSERT ON public.contratos
  FOR EACH ROW
  EXECUTE FUNCTION public.bloquear_insert_contrato_propiedad_no_disponible();

COMMIT;
