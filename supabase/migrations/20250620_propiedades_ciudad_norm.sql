-- Propiedades: incluir ciudad en la clave de unicidad de ubicación.

BEGIN;

ALTER TABLE public.propiedades
  ADD COLUMN IF NOT EXISTS ciudad_norm text;

UPDATE public.propiedades
SET ciudad_norm = CASE ciudad
  WHEN 'Córdoba' THEN 'cordoba'
  WHEN 'Villa María' THEN 'villa maria'
  WHEN 'Río Cuarto' THEN 'rio cuarto'
  ELSE lower(trim(ciudad))
END
WHERE ciudad_norm IS NULL;

ALTER TABLE public.propiedades
  ALTER COLUMN ciudad_norm SET NOT NULL;

DROP INDEX IF EXISTS public.propiedades_ubicacion_key;

CREATE UNIQUE INDEX propiedades_ubicacion_key
  ON public.propiedades (calle_norm, altura_norm, piso_norm, unidad_norm, ciudad_norm);

COMMIT;
