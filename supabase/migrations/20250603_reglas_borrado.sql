-- Reglas de borrado: propiedades e inquilinos
-- Ejecutar en Supabase → SQL Editor (una sola vez).
--
-- Propiedad: se puede borrar si no hay contratos activos.
--   → Reclamos y documentos de la propiedad se eliminan en cascada.
--   → Contratos inactivos de esa propiedad se eliminan en cascada.
-- Inquilino: se puede borrar si no hay contratos activos.
--   → Contratos inactivos del inquilino se eliminan en cascada.
--   → Reclamos del inquilino se eliminan en cascada.
-- Contratos: no hay DELETE desde la app; solo "finalizar" (activo = false).

BEGIN;

-- ---------------------------------------------------------------------------
-- Triggers: bloquear DELETE si hay contrato activo
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.bloquear_delete_propiedad_con_contrato_activo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.contratos
    WHERE propiedad_id = OLD.id
      AND activo = true
  ) THEN
    RAISE EXCEPTION 'No se puede eliminar la propiedad porque tiene contratos activos'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.bloquear_delete_inquilino_con_contrato_activo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.contratos
    WHERE inquilino_id = OLD.id
      AND activo = true
  ) THEN
    RAISE EXCEPTION 'No se puede eliminar el inquilino porque tiene contratos activos'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_propiedades_bloquear_delete_con_contrato_activo ON public.propiedades;
CREATE TRIGGER trg_propiedades_bloquear_delete_con_contrato_activo
  BEFORE DELETE ON public.propiedades
  FOR EACH ROW
  EXECUTE FUNCTION public.bloquear_delete_propiedad_con_contrato_activo();

DROP TRIGGER IF EXISTS trg_inquilinos_bloquear_delete_con_contrato_activo ON public.inquilinos;
CREATE TRIGGER trg_inquilinos_bloquear_delete_con_contrato_activo
  BEFORE DELETE ON public.inquilinos
  FOR EACH ROW
  EXECUTE FUNCTION public.bloquear_delete_inquilino_con_contrato_activo();

-- ---------------------------------------------------------------------------
-- FKs: ON DELETE CASCADE para dependencias al borrar padre
-- ---------------------------------------------------------------------------

ALTER TABLE public.contratos
  DROP CONSTRAINT IF EXISTS contratos_propiedad_id_fkey;
ALTER TABLE public.contratos
  ADD CONSTRAINT contratos_propiedad_id_fkey
  FOREIGN KEY (propiedad_id) REFERENCES public.propiedades (id) ON DELETE CASCADE;

ALTER TABLE public.contratos
  DROP CONSTRAINT IF EXISTS contratos_inquilino_id_fkey;
ALTER TABLE public.contratos
  ADD CONSTRAINT contratos_inquilino_id_fkey
  FOREIGN KEY (inquilino_id) REFERENCES public.inquilinos (id) ON DELETE CASCADE;

ALTER TABLE public.reclamos
  DROP CONSTRAINT IF EXISTS reclamos_propiedad_id_fkey;
ALTER TABLE public.reclamos
  ADD CONSTRAINT reclamos_propiedad_id_fkey
  FOREIGN KEY (propiedad_id) REFERENCES public.propiedades (id) ON DELETE CASCADE;

ALTER TABLE public.reclamos
  DROP CONSTRAINT IF EXISTS reclamos_inquilino_id_fkey;
ALTER TABLE public.reclamos
  ADD CONSTRAINT reclamos_inquilino_id_fkey
  FOREIGN KEY (inquilino_id) REFERENCES public.inquilinos (id) ON DELETE CASCADE;

ALTER TABLE public.documentos
  DROP CONSTRAINT IF EXISTS documentos_propiedad_id_fkey;
ALTER TABLE public.documentos
  ADD CONSTRAINT documentos_propiedad_id_fkey
  FOREIGN KEY (propiedad_id) REFERENCES public.propiedades (id) ON DELETE CASCADE;

ALTER TABLE public.documentos
  DROP CONSTRAINT IF EXISTS documentos_contrato_id_fkey;
ALTER TABLE public.documentos
  ADD CONSTRAINT documentos_contrato_id_fkey
  FOREIGN KEY (contrato_id) REFERENCES public.contratos (id) ON DELETE CASCADE;

COMMIT;
