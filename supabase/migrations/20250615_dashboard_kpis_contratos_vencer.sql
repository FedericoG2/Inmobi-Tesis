-- Agregar contador de contratos por vencer (90 días) a KPIs del dashboard admin

BEGIN;

DROP VIEW IF EXISTS public.dashboard_admin_kpis;

CREATE VIEW public.dashboard_admin_kpis
WITH (security_invoker = true)
AS
SELECT
  (SELECT count(*) FROM public.propiedades) AS total_propiedades,
  (SELECT count(*) FROM public.contratos WHERE activo = true) AS contratos_activos,
  (
    SELECT count(*)
    FROM public.reclamos
    WHERE estado = 'Pendiente'::public.reclamo_estado
  ) AS reclamos_pendientes,
  round(
    (
      SELECT count(*)
      FROM public.propiedades
      WHERE estado = 'Alquilada'::public.propiedad_estado
    )::numeric
    / NULLIF((SELECT count(*) FROM public.propiedades), 0)::numeric
    * 100::numeric,
    1
  ) AS porcentaje_ocupacion,
  (
    SELECT count(*)
    FROM public.contratos c
    WHERE c.activo = true
      AND c.fecha_proximo_aumento IS NOT NULL
      AND c.tipo_ajuste IN (
        'icl'::public.tipo_ajuste_contrato,
        'ipc'::public.tipo_ajuste_contrato
      )
      AND c.fecha_proximo_aumento >= CURRENT_DATE
      AND c.fecha_proximo_aumento <= CURRENT_DATE + 30
  ) AS contratos_aumento_30d,
  (
    SELECT count(*)
    FROM public.reclamos r
    WHERE r.prioridad = 'Urgente'::public.reclamo_prioridad
      AND r.estado <> 'Resuelto'::public.reclamo_estado
  ) AS reclamos_urgentes,
  (
    SELECT count(*)
    FROM public.contratos c
    WHERE c.activo = true
      AND c.fecha_fin >= CURRENT_DATE
      AND c.fecha_fin <= CURRENT_DATE + 90
  ) AS contratos_por_vencer_90d;

GRANT SELECT ON public.dashboard_admin_kpis TO authenticated, service_role;

COMMIT;
