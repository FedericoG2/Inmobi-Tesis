-- Inquilinos: normalización de dni_cuit y unicidad.

BEGIN;

UPDATE public.inquilinos
SET dni_cuit = regexp_replace(dni_cuit, '[^0-9]', '', 'g')
WHERE dni_cuit IS NOT NULL;

ALTER TABLE public.inquilinos
  DROP CONSTRAINT IF EXISTS inquilinos_dni_cuit_key;

ALTER TABLE public.inquilinos
  ADD CONSTRAINT inquilinos_dni_cuit_key UNIQUE (dni_cuit);

COMMIT;
