-- Sincronizar propiedades.estado (Disponible / Alquilada) según contratos activos.
-- Alineado con front: propiedadesService.sincronizarEstadoPropiedadPorContratos

BEGIN;

CREATE OR REPLACE FUNCTION public.sincronizar_estado_propiedad_por_contratos(p_propiedad_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.contratos
    WHERE propiedad_id = p_propiedad_id
      AND activo = true
  ) THEN
    UPDATE public.propiedades
    SET estado = 'Alquilada'::public.propiedad_estado
    WHERE id = p_propiedad_id;
  ELSE
    UPDATE public.propiedades
    SET estado = 'Disponible'::public.propiedad_estado
    WHERE id = p_propiedad_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_contratos_sincronizar_estado_propiedad()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_propiedad_id bigint;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_propiedad_id := NEW.propiedad_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.propiedad_id IS DISTINCT FROM NEW.propiedad_id THEN
      PERFORM public.sincronizar_estado_propiedad_por_contratos(OLD.propiedad_id);
    END IF;
    IF OLD.activo IS DISTINCT FROM NEW.activo OR OLD.propiedad_id IS DISTINCT FROM NEW.propiedad_id THEN
      v_propiedad_id := NEW.propiedad_id;
    ELSE
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_propiedad_id := OLD.propiedad_id;
  END IF;

  PERFORM public.sincronizar_estado_propiedad_por_contratos(v_propiedad_id);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contratos_sincronizar_estado_propiedad ON public.contratos;
CREATE TRIGGER trg_contratos_sincronizar_estado_propiedad
  AFTER INSERT OR UPDATE OF activo, propiedad_id OR DELETE ON public.contratos
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_contratos_sincronizar_estado_propiedad();

-- Alinear propiedades existentes con contratos activos actuales.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT DISTINCT propiedad_id FROM public.contratos LOOP
    PERFORM public.sincronizar_estado_propiedad_por_contratos(r.propiedad_id);
  END LOOP;
END;
$$;

COMMIT;
