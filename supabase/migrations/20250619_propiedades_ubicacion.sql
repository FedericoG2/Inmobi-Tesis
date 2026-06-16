-- Propiedades: ubicación estructurada (calle, altura, piso, unidad, ciudad) y unicidad.

BEGIN;

ALTER TABLE public.propiedades
  ADD COLUMN IF NOT EXISTS calle text,
  ADD COLUMN IF NOT EXISTS altura text,
  ADD COLUMN IF NOT EXISTS piso text,
  ADD COLUMN IF NOT EXISTS unidad text,
  ADD COLUMN IF NOT EXISTS ciudad text DEFAULT 'Córdoba',
  ADD COLUMN IF NOT EXISTS calle_norm text,
  ADD COLUMN IF NOT EXISTS altura_norm text,
  ADD COLUMN IF NOT EXISTS piso_norm text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS unidad_norm text NOT NULL DEFAULT '';

UPDATE public.propiedades SET
  calle = 'Av. Fabricio E. Carrascull',
  altura = '621',
  piso = NULL,
  unidad = NULL,
  ciudad = 'Córdoba',
  direccion = 'Av. Fabricio E. Carrascull 621, Córdoba',
  calle_norm = 'av fabricio e carrascull',
  altura_norm = '621',
  piso_norm = '',
  unidad_norm = ''
WHERE id = 8;

UPDATE public.propiedades SET
  calle = 'Av. Colón',
  altura = '4500',
  piso = NULL,
  unidad = NULL,
  ciudad = 'Córdoba',
  direccion = 'Av. Colón 4500, Córdoba',
  calle_norm = 'av colon',
  altura_norm = '4500',
  piso_norm = '',
  unidad_norm = ''
WHERE id = 9;

UPDATE public.propiedades SET
  calle = 'Bv. Illia',
  altura = '50',
  piso = NULL,
  unidad = NULL,
  ciudad = 'Córdoba',
  direccion = 'Bv. Illia 50, Córdoba',
  calle_norm = 'bv illia',
  altura_norm = '50',
  piso_norm = '',
  unidad_norm = ''
WHERE id = 10;

UPDATE public.propiedades SET
  calle = 'Av. Tristán Malbrán',
  altura = '3866',
  piso = NULL,
  unidad = NULL,
  ciudad = 'Córdoba',
  direccion = 'Av. Tristán Malbrán 3866, Córdoba',
  calle_norm = 'av tristan malbran',
  altura_norm = '3866',
  piso_norm = '',
  unidad_norm = ''
WHERE id = 11;

UPDATE public.propiedades SET
  calle = 'Av. Vélez Sársfield',
  altura = '1280',
  piso = NULL,
  unidad = NULL,
  ciudad = 'Córdoba',
  direccion = 'Av. Vélez Sársfield 1280, Córdoba',
  calle_norm = 'av velez sarsfield',
  altura_norm = '1280',
  piso_norm = '',
  unidad_norm = ''
WHERE id = 12;

ALTER TABLE public.propiedades
  ALTER COLUMN calle SET NOT NULL,
  ALTER COLUMN altura SET NOT NULL,
  ALTER COLUMN ciudad SET NOT NULL,
  ALTER COLUMN calle_norm SET NOT NULL,
  ALTER COLUMN altura_norm SET NOT NULL;

DROP INDEX IF EXISTS public.propiedades_ubicacion_key;

CREATE UNIQUE INDEX propiedades_ubicacion_key
  ON public.propiedades (calle_norm, altura_norm, piso_norm, unidad_norm);

COMMIT;
