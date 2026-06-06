-- =============================================================================
-- INMOBI — Módulo aumentos (DOWN) — revierte Paso 1
-- =============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.confirmar_aumentos(jsonb);

DROP POLICY IF EXISTS "Admin CRUD total / Inquilino ve aumentos de su contrato activo" ON public.aumentos;
DROP POLICY IF EXISTS "Admin CRUD indices" ON public.indices;

DROP TABLE IF EXISTS public.aumentos;
DROP TABLE IF EXISTS public.indices;

DROP TYPE IF EXISTS public.indice_referencia;

COMMIT;
