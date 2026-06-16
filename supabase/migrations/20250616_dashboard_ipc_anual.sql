-- Vista IPC mensual del año en curso para el dashboard admin

BEGIN;

DROP VIEW IF EXISTS public.dashboard_ipc_anual;

CREATE VIEW public.dashboard_ipc_anual
WITH (security_invoker = true)
AS
SELECT
  i.anio,
  i.mes,
  i.valor
FROM public.indices i
WHERE i.indice = 'ipc'::public.indice_referencia
  AND i.anio IS NOT NULL
  AND i.mes IS NOT NULL
  AND i.anio = EXTRACT(YEAR FROM CURRENT_DATE)::integer
ORDER BY i.mes;

GRANT SELECT ON public.dashboard_ipc_anual TO authenticated, service_role;

COMMIT;
