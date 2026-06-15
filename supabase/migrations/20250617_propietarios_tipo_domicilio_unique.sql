-- Propietarios: tipo_persona, domicilio, normalización DNI/teléfono y unicidad.

BEGIN;

ALTER TABLE public.propietarios
  ADD COLUMN IF NOT EXISTS tipo_persona public.tipo_persona_enum NOT NULL DEFAULT 'Física';

ALTER TABLE public.propietarios
  ADD COLUMN IF NOT EXISTS domicilio text;

UPDATE public.propietarios
SET
  dni_cuit = regexp_replace(dni_cuit, '[^0-9]', '', 'g'),
  telefono = regexp_replace(COALESCE(telefono, ''), '[^0-9]', '', 'g')
WHERE dni_cuit IS NOT NULL OR telefono IS NOT NULL;

UPDATE public.propietarios
SET
  nombre_completo = 'María Elena Rodríguez',
  tipo_persona = 'Física',
  dni_cuit = '27301234568',
  telefono = '3514567890',
  email = 'maria.rodriguez@gmail.com',
  domicilio = 'Av. Colón 1820, Córdoba'
WHERE id = 3;

UPDATE public.propietarios
SET
  nombre_completo = 'Inversiones del Sur S.A.',
  tipo_persona = 'Jurídica',
  dni_cuit = '30708945612',
  telefono = '3514789012',
  email = 'administracion@inversionesdelsur.com',
  domicilio = 'Av. Vélez Sársfield 456, Córdoba'
WHERE id = 5;

ALTER TABLE public.propietarios
  DROP CONSTRAINT IF EXISTS propietarios_dni_cuit_key;

ALTER TABLE public.propietarios
  ADD CONSTRAINT propietarios_dni_cuit_key UNIQUE (dni_cuit);

COMMIT;
