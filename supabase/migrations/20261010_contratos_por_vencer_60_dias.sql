-- "Contratos por vencer" pasa a 60 días en el Dashboard, igual que en el módulo de Contratos.

ALTER VIEW public.dashboard_admin_kpis RENAME COLUMN contratos_por_vencer_90d TO contratos_por_vencer_60d;

CREATE OR REPLACE VIEW public.dashboard_admin_kpis AS
SELECT
  (SELECT count(*) FROM propiedades) AS total_propiedades,
  (SELECT count(*) FROM contratos WHERE contratos.estado = 'activo'::contrato_estado) AS contratos_activos,
  (SELECT count(*) FROM reclamos WHERE reclamos.estado = 'Pendiente'::reclamo_estado) AS reclamos_pendientes,
  round(
    (SELECT count(*) FROM propiedades WHERE propiedades.estado = 'Alquilada'::propiedad_estado)::numeric
    / NULLIF((SELECT count(*) FROM propiedades), 0)::numeric * 100::numeric,
    1
  ) AS porcentaje_ocupacion,
  (SELECT count(*) FROM contratos c
    WHERE c.estado = 'activo'::contrato_estado
      AND c.fecha_proximo_aumento IS NOT NULL
      AND c.tipo_ajuste = ANY (ARRAY['icl'::tipo_ajuste_contrato, 'ipc'::tipo_ajuste_contrato])
      AND c.fecha_proximo_aumento >= CURRENT_DATE
      AND c.fecha_proximo_aumento <= CURRENT_DATE + 30) AS contratos_aumento_30d,
  (SELECT count(*) FROM reclamos r
    WHERE r.prioridad = 'Urgente'::reclamo_prioridad
      AND r.estado <> 'Resuelto'::reclamo_estado) AS reclamos_urgentes,
  (SELECT count(*) FROM contratos c
    WHERE c.estado = 'activo'::contrato_estado
      AND c.fecha_fin >= CURRENT_DATE
      AND c.fecha_fin <= CURRENT_DATE + 60) AS contratos_por_vencer_60d,
  (SELECT count(*) FROM contratos c
    WHERE c.estado = 'activo'::contrato_estado
      AND c.fecha_proximo_aumento IS NOT NULL
      AND c.tipo_ajuste = ANY (ARRAY['icl'::tipo_ajuste_contrato, 'ipc'::tipo_ajuste_contrato])
      AND c.fecha_proximo_aumento < CURRENT_DATE
      AND c.fecha_proximo_aumento <= c.fecha_fin) AS aumentos_vencidos;

CREATE OR REPLACE VIEW public.dashboard_contratos_por_vencer AS
SELECT
  c.id AS contrato_id,
  c.fecha_fin,
  c.fecha_fin - CURRENT_DATE AS dias_restantes,
  c.monto_alquiler,
  i.nombre_completo AS inquilino_nombre,
  p.direccion AS propiedad_direccion
FROM contratos c
JOIN inquilinos i ON i.id = c.inquilino_id
JOIN propiedades p ON p.id = c.propiedad_id
WHERE c.estado = 'activo'::contrato_estado
  AND c.fecha_fin >= CURRENT_DATE
  AND c.fecha_fin <= CURRENT_DATE + 60;

ALTER VIEW public.dashboard_admin_kpis SET (security_invoker = true);
ALTER VIEW public.dashboard_contratos_por_vencer SET (security_invoker = true);
