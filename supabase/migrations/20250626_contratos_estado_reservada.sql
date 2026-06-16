-- Contratos: estado programado/activo/inactivo, propiedad Reservada, anti-solapamiento.

BEGIN;

-- ---------------------------------------------------------------------------
-- Enum propiedad: Reservada
-- ---------------------------------------------------------------------------

ALTER TYPE public.propiedad_estado ADD VALUE IF NOT EXISTS 'Reservada';

-- ---------------------------------------------------------------------------
-- Enum y columna estado en contratos
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contrato_estado') THEN
    CREATE TYPE public.contrato_estado AS ENUM ('programado', 'activo', 'inactivo');
  END IF;
END
$$;

ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS estado public.contrato_estado;

UPDATE public.contratos
SET estado = CASE WHEN activo THEN 'activo'::public.contrato_estado ELSE 'inactivo'::public.contrato_estado END
WHERE estado IS NULL;

ALTER TABLE public.contratos
  ALTER COLUMN estado SET NOT NULL;

-- ---------------------------------------------------------------------------
-- Activar contratos programados cuya vigencia ya comenzó
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.activar_contratos_programados()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  r record;
BEGIN
  UPDATE public.contratos
  SET estado = 'activo'::public.contrato_estado,
      activo = true
  WHERE estado = 'programado'::public.contrato_estado
    AND fecha_inicio <= CURRENT_DATE;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  FOR r IN
    SELECT DISTINCT propiedad_id
    FROM public.contratos
    WHERE estado = 'activo'::public.contrato_estado
      AND fecha_inicio <= CURRENT_DATE
  LOOP
    PERFORM public.sincronizar_estado_propiedad_por_contratos(r.propiedad_id);
  END LOOP;

  RETURN v_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- Sincronizar estado de propiedad (Disponible / Reservada / Alquilada)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sincronizar_estado_propiedad_por_contratos(p_propiedad_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_estado_actual public.propiedad_estado;
BEGIN
  SELECT estado INTO v_estado_actual
  FROM public.propiedades
  WHERE id = p_propiedad_id;

  IF v_estado_actual = 'Mantenimiento'::public.propiedad_estado THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.contratos
    WHERE propiedad_id = p_propiedad_id
      AND estado = 'activo'::public.contrato_estado
  ) THEN
    UPDATE public.propiedades
    SET estado = 'Alquilada'::public.propiedad_estado
    WHERE id = p_propiedad_id;
  ELSIF EXISTS (
    SELECT 1
    FROM public.contratos
    WHERE propiedad_id = p_propiedad_id
      AND estado = 'programado'::public.contrato_estado
  ) THEN
    UPDATE public.propiedades
    SET estado = 'Reservada'::public.propiedad_estado
    WHERE id = p_propiedad_id;
  ELSE
    UPDATE public.propiedades
    SET estado = 'Disponible'::public.propiedad_estado
    WHERE id = p_propiedad_id;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- INSERT: validar propiedad, solapamiento y asignar estado
-- ---------------------------------------------------------------------------

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
    FROM public.contratos c
    WHERE c.propiedad_id = NEW.propiedad_id
      AND c.estado IN ('programado'::public.contrato_estado, 'activo'::public.contrato_estado)
      AND daterange(c.fecha_inicio, c.fecha_fin, '[]')
          && daterange(NEW.fecha_inicio, NEW.fecha_fin, '[]')
  ) THEN
    RAISE EXCEPTION 'Las fechas se solapan con otro contrato de esta propiedad'
      USING ERRCODE = 'P0001';
  END IF;

  IF NEW.fecha_inicio > CURRENT_DATE THEN
    NEW.estado := 'programado'::public.contrato_estado;
    NEW.activo := false;
  ELSE
    NEW.estado := 'activo'::public.contrato_estado;
    NEW.activo := true;
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Finalizar / anular: usar estado
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.bloquear_delete_contrato_con_movimientos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.estado = 'activo'::public.contrato_estado THEN
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
    IF OLD.estado IS DISTINCT FROM NEW.estado OR OLD.propiedad_id IS DISTINCT FROM NEW.propiedad_id THEN
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
  AFTER INSERT OR UPDATE OF estado, propiedad_id OR DELETE ON public.contratos
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_contratos_sincronizar_estado_propiedad();

-- Bloquear delete inquilino/propiedad: contratos activos o programados
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
      AND estado IN ('activo'::public.contrato_estado, 'programado'::public.contrato_estado)
  ) THEN
    RAISE EXCEPTION 'No se puede eliminar el inquilino porque tiene contratos activos'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN OLD;
END;
$$;

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
      AND estado IN ('activo'::public.contrato_estado, 'programado'::public.contrato_estado)
  ) THEN
    RAISE EXCEPTION 'No se puede eliminar la propiedad porque tiene contratos activos'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN OLD;
END;
$$;

-- Re-sincronizar propiedades existentes
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT DISTINCT propiedad_id FROM public.contratos LOOP
    PERFORM public.sincronizar_estado_propiedad_por_contratos(r.propiedad_id);
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.activar_contratos_programados() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sincronizar_estado_propiedad_por_contratos(bigint) TO authenticated, service_role;

COMMIT;
