-- Contratos programados: usar fecha local Argentina (no UTC) para vigencia.

BEGIN;

CREATE OR REPLACE FUNCTION public.fecha_hoy_ar()
RETURNS date
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT (now() AT TIME ZONE 'America/Argentina/Cordoba')::date;
$$;

REVOKE ALL ON FUNCTION public.fecha_hoy_ar() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fecha_hoy_ar() TO authenticated, service_role;

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
    AND fecha_inicio <= public.fecha_hoy_ar();

  GET DIAGNOSTICS v_count = ROW_COUNT;

  FOR r IN
    SELECT DISTINCT propiedad_id
    FROM public.contratos
    WHERE estado = 'activo'::public.contrato_estado
      AND fecha_inicio <= public.fecha_hoy_ar()
  LOOP
    PERFORM public.sincronizar_estado_propiedad_por_contratos(r.propiedad_id);
  END LOOP;

  RETURN v_count;
END;
$$;

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

  IF NEW.fecha_proximo_aumento IS NOT NULL
     AND NEW.fecha_proximo_aumento > NEW.fecha_fin THEN
    RAISE EXCEPTION 'La fecha del proximo aumento no puede ser posterior al fin del contrato'
      USING ERRCODE = 'P0001';
  END IF;

  IF NEW.fecha_inicio > public.fecha_hoy_ar() THEN
    NEW.estado := 'programado'::public.contrato_estado;
    NEW.activo := false;
  ELSE
    NEW.estado := 'activo'::public.contrato_estado;
    NEW.activo := true;
  END IF;

  RETURN NEW;
END;
$$;

-- Corregir contratos futuros marcados activos por desfase UTC.
UPDATE public.contratos
SET estado = 'programado'::public.contrato_estado,
    activo = false
WHERE estado = 'activo'::public.contrato_estado
  AND fecha_inicio > public.fecha_hoy_ar();

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT propiedad_id
    FROM public.contratos
    WHERE estado IN ('activo'::public.contrato_estado, 'programado'::public.contrato_estado)
  LOOP
    PERFORM public.sincronizar_estado_propiedad_por_contratos(r.propiedad_id);
  END LOOP;
END;
$$;

COMMIT;
