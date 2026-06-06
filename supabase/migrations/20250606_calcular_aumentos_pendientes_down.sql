-- =============================================================================
-- INMOBI — Cálculo ICL (DOWN) — revierte Paso 2
-- =============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.calcular_aumentos_pendientes(boolean, int);
DROP FUNCTION IF EXISTS public.icl_valor_en_fecha(date);

COMMIT;
