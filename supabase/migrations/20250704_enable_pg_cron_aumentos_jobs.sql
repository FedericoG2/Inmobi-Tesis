-- =============================================================================
-- INMOBI — Habilitar pg_cron y agendar tareas diarias
--   - aplicar-aumentos-programados: aplica los aumentos acordados al llegar la fecha.
--   - activar-contratos-programados: activa contratos cuyo inicio ya llegó.
-- El frontend también las invoca "al acceder" como respaldo (idempotentes).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'aplicar-aumentos-programados') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'aplicar-aumentos-programados';
  END IF;
  PERFORM cron.schedule(
    'aplicar-aumentos-programados',
    '10 3 * * *',
    $$SELECT public.aplicar_aumentos_programados();$$
  );

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'activar-contratos-programados') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'activar-contratos-programados';
  END IF;
  PERFORM cron.schedule(
    'activar-contratos-programados',
    '5 3 * * *',
    $$SELECT public.activar_contratos_programados();$$
  );
END;
$cron$;
