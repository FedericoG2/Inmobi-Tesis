-- Una propiedad con contratos (de cualquier estado) o reclamos no se elimina: se conserva como historial.
-- Evita que el ON DELETE CASCADE borre contratos finalizados, reclamos y documentos.

CREATE OR REPLACE FUNCTION public.bloquear_delete_propiedad_con_contrato_activo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM public.contratos WHERE propiedad_id = OLD.id) THEN
    RAISE EXCEPTION 'No se puede eliminar la propiedad porque tiene contratos asociados'
      USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.reclamos WHERE propiedad_id = OLD.id) THEN
    RAISE EXCEPTION 'No se puede eliminar la propiedad porque tiene reclamos asociados'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN OLD;
END;
$function$;
