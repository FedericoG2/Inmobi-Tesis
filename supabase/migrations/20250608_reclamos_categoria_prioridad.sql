-- Columnas categoria y prioridad en reclamos (ENUMs ya existentes).
-- Ejecutar en bloque; ROLLBACK manual si algo falla antes del COMMIT.

BEGIN;

ALTER TABLE public.reclamos
  ADD COLUMN IF NOT EXISTS categoria public.reclamo_categoria,
  ADD COLUMN IF NOT EXISTS prioridad public.reclamo_prioridad
    NOT NULL DEFAULT 'Media'::reclamo_prioridad;

COMMENT ON COLUMN public.reclamos.categoria IS 'Rubro del reclamo (plomería, electricidad, etc.)';
COMMENT ON COLUMN public.reclamos.prioridad IS 'Prioridad operativa; default Media al crear';

COMMIT;

-- Rollback (solo si aún no commiteaste o para revertir después):
-- BEGIN;
-- ALTER TABLE public.reclamos DROP COLUMN IF EXISTS categoria;
-- ALTER TABLE public.reclamos DROP COLUMN IF EXISTS prioridad;
-- COMMIT;
