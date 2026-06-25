-- =============================================================================
-- INMOBI — Dashboard: recordatorio de aumentos vencidos sin confirmar
--   - dashboard_admin_kpis: nuevo contador aumentos_vencidos.
--   - dashboard_admin_aumentos_vencidos: lista (más antiguos primero).
-- "Vencido sin confirmar" = contrato activo ICL/IPC con fecha_proximo_aumento
--   anterior a hoy (si se hubiera confirmado, la fecha ya habría avanzado).
-- =============================================================================

BEGIN;

CREATE OR REPLACE VIEW public.dashboard_admin_kpis
WITH (security_invoker = true)
AS
SELECT
  (SELECT count(*) FROM public.propiedades) AS total_propiedades,
  (SELECT count(*) FROM public.contratos WHERE activo = true) AS contratos_activos,
  (SELECT count(*) FROM public.reclamos WHERE estado = 'Pendiente'::public.reclamo_estado) AS reclamos_pendientes,
  round(
    ((SELECT count(*) FROM public.propiedades WHERE estado = 'Alquilada'::public.propiedad_estado))::numeric
    / NULLIF((SELECT count(*) FROM public.propiedades), 0)::numeric * 100::numeric,
    1
  ) AS porcentaje_ocupacion,
  (
    SELECT count(*) FROM public.contratos c
    WHERE c.activo = true
      AND c.fecha_proximo_aumento IS NOT NULL
      AND c.tipo_ajuste = ANY (ARRAY['icl'::public.tipo_ajuste_contrato, 'ipc'::public.tipo_ajuste_contrato])
      AND c.fecha_proximo_aumento >= CURRENT_DATE
      AND c.fecha_proximo_aumento <= (CURRENT_DATE + 30)
  ) AS contratos_aumento_30d,
  (
    SELECT count(*) FROM public.reclamos r
    WHERE r.prioridad = 'Urgente'::public.reclamo_prioridad
      AND r.estado <> 'Resuelto'::public.reclamo_estado
  ) AS reclamos_urgentes,
  (
    SELECT count(*) FROM public.contratos c
    WHERE c.activo = true
      AND c.fecha_fin >= CURRENT_DATE
      AND c.fecha_fin <= (CURRENT_DATE + 90)
  ) AS contratos_por_vencer_90d,
  (
    SELECT count(*) FROM public.contratos c
    WHERE c.activo = true
      AND c.fecha_proximo_aumento IS NOT NULL
      AND c.tipo_ajuste = ANY (ARRAY['icl'::public.tipo_ajuste_contrato, 'ipc'::public.tipo_ajuste_contrato])
      AND c.fecha_proximo_aumento < CURRENT_DATE
      AND c.fecha_proximo_aumento <= c.fecha_fin
  ) AS aumentos_vencidos;

DROP VIEW IF EXISTS public.dashboard_admin_aumentos_vencidos;
CREATE VIEW public.dashboard_admin_aumentos_vencidos
WITH (security_invoker = true)
AS
SELECT
  c.id AS contrato_id,
  c.fecha_proximo_aumento,
  CURRENT_DATE - c.fecha_proximo_aumento AS dias_vencido,
  c.monto_alquiler,
  c.tipo_ajuste,
  i.nombre_completo AS inquilino_nombre,
  p.direccion AS propiedad_direccion
FROM public.contratos c
INNER JOIN public.inquilinos i ON i.id = c.inquilino_id
INNER JOIN public.propiedades p ON p.id = c.propiedad_id
WHERE c.activo = true
  AND c.fecha_proximo_aumento IS NOT NULL
  AND c.tipo_ajuste = ANY (ARRAY['icl'::public.tipo_ajuste_contrato, 'ipc'::public.tipo_ajuste_contrato])
  AND c.fecha_proximo_aumento < CURRENT_DATE
  AND c.fecha_proximo_aumento <= c.fecha_fin;

GRANT SELECT ON public.dashboard_admin_aumentos_vencidos TO authenticated, service_role;

COMMIT;
