-- Alinea la RLS de aumentos con la fuente de verdad del sistema: contratos.estado.
-- Antes dependía de la columna legacy contratos.activo (sin sincronización
-- garantizada). Comportamiento idéntico hoy (estado y activo coinciden), pero
-- elimina la dependencia de la columna muerta.
DROP POLICY IF EXISTS "Admin CRUD total / Inquilino ve aumentos de su contrato activo"
  ON public.aumentos;

CREATE POLICY "Admin CRUD total / Inquilino ve aumentos de su contrato activo"
  ON public.aumentos FOR ALL TO authenticated
  USING (
    public.es_admin()
    OR contrato_id IN (
      SELECT c.id FROM public.contratos c
      WHERE c.inquilino_id = public.obtener_inquilino_id()
        AND c.estado = 'activo'::public.contrato_estado
    )
  )
  WITH CHECK (public.es_admin());
