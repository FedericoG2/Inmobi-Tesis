-- Las reglas que hoy frena la pantalla pasan a la base:
-- una propiedad nueva no nace Alquilada, y un contrato ya cargado no se edita.

CREATE OR REPLACE FUNCTION public.bloquear_propiedad_estado_alquilada_manual()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.estado = 'Alquilada'::public.propiedad_estado THEN
    RAISE EXCEPTION 'Una propiedad nueva no puede crearse en estado Alquilada. Ese estado se asigna al vincular un contrato'
      USING ERRCODE = 'P0001';
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.estado = 'Alquilada'::public.propiedad_estado
     AND OLD.estado IS DISTINCT FROM 'Alquilada'::public.propiedad_estado
     AND NOT EXISTS (
       SELECT 1
       FROM public.contratos
       WHERE propiedad_id = NEW.id
         AND estado = 'activo'::public.contrato_estado
     )
  THEN
    RAISE EXCEPTION 'El estado Alquilada solo puede asignarse al vincular un contrato activo'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_propiedades_bloquear_estado_alquilada_manual ON public.propiedades;
CREATE TRIGGER trg_propiedades_bloquear_estado_alquilada_manual
  BEFORE INSERT OR UPDATE OF estado ON public.propiedades
  FOR EACH ROW
  EXECUTE FUNCTION public.bloquear_propiedad_estado_alquilada_manual();

CREATE OR REPLACE FUNCTION public.bloquear_update_condiciones_contrato()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.propiedad_id IS DISTINCT FROM OLD.propiedad_id
     OR NEW.inquilino_id IS DISTINCT FROM OLD.inquilino_id
     OR NEW.fecha_inicio IS DISTINCT FROM OLD.fecha_inicio
     OR NEW.fecha_fin IS DISTINCT FROM OLD.fecha_fin
     OR NEW.monto_inicial IS DISTINCT FROM OLD.monto_inicial
     OR NEW.periodicidad_meses IS DISTINCT FROM OLD.periodicidad_meses
     OR NEW.tipo_ajuste IS DISTINCT FROM OLD.tipo_ajuste
     OR NEW.dia_vencimiento IS DISTINCT FROM OLD.dia_vencimiento
     OR NEW.observaciones IS DISTINCT FROM OLD.observaciones
  THEN
    RAISE EXCEPTION 'Un contrato ya cargado no se edita. Para cambiar las condiciones hay que finalizarlo o eliminarlo y registrar uno nuevo'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_contratos_bloquear_update_condiciones ON public.contratos;
CREATE TRIGGER trg_contratos_bloquear_update_condiciones
  BEFORE UPDATE ON public.contratos
  FOR EACH ROW
  EXECUTE FUNCTION public.bloquear_update_condiciones_contrato();

REVOKE ALL ON FUNCTION public.bloquear_propiedad_estado_alquilada_manual() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bloquear_update_condiciones_contrato() FROM PUBLIC, anon, authenticated;
