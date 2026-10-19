-- El Encargado consulta aumentos y el historial de reclamos.
-- Confirmar, deshacer y registrar eventos pasa solo por las funciones
-- confirmar_aumentos, deshacer_aumento y gestionar_reclamo.

DROP POLICY IF EXISTS aumentos_encargado ON public.aumentos;
DROP POLICY IF EXISTS "Admin CRUD total / Inquilino ve aumentos de su contrato activo" ON public.aumentos;

CREATE POLICY aumentos_encargado_select
  ON public.aumentos
  FOR SELECT
  TO authenticated
  USING (public.es_encargado());

DROP POLICY IF EXISTS reclamo_eventos_encargado ON public.reclamo_eventos;
DROP POLICY IF EXISTS "Admin gestiona eventos de reclamos" ON public.reclamo_eventos;

CREATE POLICY reclamo_eventos_encargado_select
  ON public.reclamo_eventos
  FOR SELECT
  TO authenticated
  USING (public.es_encargado());

REVOKE INSERT, UPDATE, DELETE ON TABLE public.aumentos FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.reclamo_eventos FROM PUBLIC, anon, authenticated;
