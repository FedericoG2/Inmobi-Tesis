-- =============================================================================
-- INMOBI — Limpieza total de datos de negocio (OPCIONAL, DESTRUCTIVO)
--
-- Borra TODOS los propietarios, propiedades, inquilinos, contratos, aumentos,
-- reclamos, documentos (filas) y la actividad, para arrancar la demo de cero.
-- NO toca usuarios (auth.users / perfiles) ni los índices ICL/IPC.
-- Los archivos del Storage no se borran (quedan huérfanos, no afectan la app).
--
-- Uso: Supabase → SQL Editor → ejecutar ANTES de demo_01_presentacion.sql.
-- =============================================================================

BEGIN;

-- Los borrados disparan triggers de validación: respetamos el orden de dependencias.
DELETE FROM public.documentos;
DELETE FROM public.reclamo_eventos;
DELETE FROM public.reclamos;
DELETE FROM public.aumentos;

-- Los contratos activos/programados bloquean el borrado de propiedades e inquilinos.
UPDATE public.contratos
SET estado = 'inactivo'::public.contrato_estado, activo = false
WHERE estado <> 'inactivo'::public.contrato_estado;

DELETE FROM public.contratos;
DELETE FROM public.propiedades;
UPDATE public.inquilinos SET perfil_id = NULL WHERE perfil_id IS NOT NULL;
DELETE FROM public.inquilinos;
DELETE FROM public.propietarios;

-- Registro de actividad (si la migración 20261008_actividad_sistema.sql ya se ejecutó).
DO $$
BEGIN
  IF to_regclass('public.actividad') IS NOT NULL THEN
    DELETE FROM public.actividad;
  END IF;
END $$;

COMMIT;
