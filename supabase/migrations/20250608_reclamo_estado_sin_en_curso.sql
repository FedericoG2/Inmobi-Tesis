-- Quitar 'en_curso' de reclamo_estado (recrear enum).
-- Requiere dropear vistas del dashboard que referencian reclamos.estado.

BEGIN;

DROP VIEW IF EXISTS public.dashboard_inquilino_resumen;
DROP VIEW IF EXISTS public.dashboard_admin_kpis;

DROP POLICY IF EXISTS "Admin modifica todo / Inquilino edita solo si esta Pendiente"
  ON public.reclamos;

ALTER TYPE public.reclamo_estado RENAME TO reclamo_estado_old;

CREATE TYPE public.reclamo_estado AS ENUM (
  'Pendiente',
  'En Proceso',
  'Resuelto',
  'Revision',
  'Rechazado'
);

ALTER TABLE public.reclamos
  ALTER COLUMN estado DROP DEFAULT,
  ALTER COLUMN estado TYPE public.reclamo_estado
    USING estado::text::public.reclamo_estado,
  ALTER COLUMN estado SET DEFAULT 'Pendiente'::public.reclamo_estado;

DROP TYPE public.reclamo_estado_old;

CREATE POLICY "Admin modifica todo / Inquilino edita solo si esta Pendiente"
ON public.reclamos
FOR UPDATE
TO public
USING (
  es_admin()
  OR (
    inquilino_id = obtener_inquilino_id()
    AND estado = 'Pendiente'::reclamo_estado
  )
);

CREATE VIEW public.dashboard_admin_kpis AS
 SELECT ( SELECT count(*) AS count
           FROM propiedades) AS total_propiedades,
    ( SELECT count(*) AS count
           FROM contratos
          WHERE contratos.activo = true) AS contratos_activos,
    ( SELECT count(*) AS count
           FROM inquilinos) AS total_inquilinos,
    ( SELECT count(*) AS count
           FROM reclamos
          WHERE reclamos.estado = 'Pendiente'::reclamo_estado) AS reclamos_pendientes,
    round((( SELECT count(*) AS count
           FROM propiedades
          WHERE propiedades.estado = 'Alquilada'::propiedad_estado))::numeric / NULLIF(( SELECT count(*) AS count
           FROM propiedades), 0)::numeric * 100::numeric, 1) AS porcentaje_ocupacion;

CREATE VIEW public.dashboard_inquilino_resumen AS
 SELECT per.id AS perfil_id,
    i.id AS inquilino_id,
    i.nombre_completo,
    p.direccion AS propiedad_direccion,
    p.tipo AS propiedad_tipo,
    c.fecha_fin AS contrato_fin,
    c.fecha_fin - CURRENT_DATE AS contrato_dias_restantes,
    c.monto_alquiler,
    ( SELECT count(*) AS count
           FROM reclamos r
          WHERE r.inquilino_id = i.id AND r.estado = 'Pendiente'::reclamo_estado) AS mis_reclamos_pendientes,
    ( SELECT count(*) AS count
           FROM reclamos r
          WHERE r.inquilino_id = i.id AND r.estado = 'En Proceso'::reclamo_estado) AS mis_reclamos_en_proceso
   FROM perfiles per
     JOIN inquilinos i ON per.id = i.perfil_id
     LEFT JOIN contratos c ON i.id = c.inquilino_id AND c.activo = true
     LEFT JOIN propiedades p ON c.propiedad_id = p.id;

GRANT SELECT ON public.dashboard_admin_kpis TO anon, authenticated, service_role;
GRANT SELECT ON public.dashboard_inquilino_resumen TO anon, authenticated, service_role;

COMMIT;
