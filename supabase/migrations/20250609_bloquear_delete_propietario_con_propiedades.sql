-- Propietario: solo se puede borrar si no tiene propiedades asociadas.
-- Alineado con front: propietariosService.js, AdminPropietarios.jsx

BEGIN;

CREATE OR REPLACE FUNCTION public.bloquear_delete_propietario_con_propiedades()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.propiedades
    WHERE propietario_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'No se puede eliminar el propietario porque tiene propiedades asociadas'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_propietarios_bloquear_delete_con_propiedades ON public.propietarios;
CREATE TRIGGER trg_propietarios_bloquear_delete_con_propiedades
  BEFORE DELETE ON public.propietarios
  FOR EACH ROW
  EXECUTE FUNCTION public.bloquear_delete_propietario_con_propiedades();

-- Evitar ON DELETE SET NULL: la FK debe impedir el borrado si hay referencias.
ALTER TABLE public.propiedades
  DROP CONSTRAINT IF EXISTS propiedades_propietario_id_fkey;

ALTER TABLE public.propiedades
  ADD CONSTRAINT propiedades_propietario_id_fkey
  FOREIGN KEY (propietario_id) REFERENCES public.propietarios (id) ON DELETE RESTRICT;

COMMIT;
