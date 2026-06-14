-- =============================================================================
-- INMOBI — Dashboard admin (UP)
-- KPIs, alertas, propiedades por estado y contratos por vencer
-- =============================================================================

BEGIN;

DROP VIEW IF EXISTS public.dashboard_admin_aumentos_proximos;
DROP VIEW IF EXISTS public.dashboard_admin_reclamos_urgentes;
DROP VIEW IF EXISTS public.dashboard_propiedades_por_estado;
DROP VIEW IF EXISTS public.dashboard_contratos_por_vencer;
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
  ) AS reclamos_urgentes;

CREATE VIEW public.dashboard_admin_aumentos_proximos
WITH (security_invoker = true)
AS
SELECT
  c.id AS contrato_id,
  c.fecha_proximo_aumento,
  c.fecha_proximo_aumento - CURRENT_DATE AS dias_hasta_aumento,
  c.monto_alquiler,
  c.tipo_ajuste,
  i.nombre_completo AS inquilino_nombre,
  p.direccion AS propiedad_direccion
FROM public.contratos c
INNER JOIN public.inquilinos i ON i.id = c.inquilino_id
INNER JOIN public.propiedades p ON p.id = c.propiedad_id
WHERE c.activo = true
  AND c.fecha_proximo_aumento IS NOT NULL
  AND c.tipo_ajuste IN (
    'icl'::public.tipo_ajuste_contrato,
    'ipc'::public.tipo_ajuste_contrato
  )
  AND c.fecha_proximo_aumento >= CURRENT_DATE
  AND c.fecha_proximo_aumento <= CURRENT_DATE + 30;

CREATE VIEW public.dashboard_admin_reclamos_urgentes
WITH (security_invoker = true)
AS
SELECT
  r.id AS reclamo_id,
  r.titulo,
  r.estado,
  r.prioridad,
  r.fecha_creacion,
  i.nombre_completo AS inquilino_nombre,
  p.direccion AS propiedad_direccion
FROM public.reclamos r
INNER JOIN public.inquilinos i ON i.id = r.inquilino_id
INNER JOIN public.propiedades p ON p.id = r.propiedad_id
WHERE r.prioridad = 'Urgente'::public.reclamo_prioridad
  AND r.estado <> 'Resuelto'::public.reclamo_estado;

CREATE VIEW public.dashboard_propiedades_por_estado
WITH (security_invoker = true)
AS
SELECT
  p.estado,
  count(*)::int AS cantidad
FROM public.propiedades p
GROUP BY p.estado;

CREATE VIEW public.dashboard_contratos_por_vencer
WITH (security_invoker = true)
AS
SELECT
  c.id AS contrato_id,
  c.fecha_fin,
  c.fecha_fin - CURRENT_DATE AS dias_restantes,
  c.monto_alquiler,
  i.nombre_completo AS inquilino_nombre,
  p.direccion AS propiedad_direccion
FROM public.contratos c
INNER JOIN public.inquilinos i ON i.id = c.inquilino_id
INNER JOIN public.propiedades p ON p.id = c.propiedad_id
WHERE c.activo = true
  AND c.fecha_fin >= CURRENT_DATE
  AND c.fecha_fin <= CURRENT_DATE + 90;

GRANT SELECT ON public.dashboard_admin_kpis TO authenticated, service_role;
GRANT SELECT ON public.dashboard_admin_aumentos_proximos TO authenticated, service_role;
GRANT SELECT ON public.dashboard_admin_reclamos_urgentes TO authenticated, service_role;
GRANT SELECT ON public.dashboard_propiedades_por_estado TO authenticated, service_role;
GRANT SELECT ON public.dashboard_contratos_por_vencer TO authenticated, service_role;

COMMIT;
