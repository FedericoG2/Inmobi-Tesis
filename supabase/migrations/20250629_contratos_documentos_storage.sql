-- Storage: políticas para adjuntos de contratos legales (PDF / Word).

BEGIN;

DROP POLICY IF EXISTS "Admin gestiona archivos contratos" ON storage.objects;
CREATE POLICY "Admin gestiona archivos contratos"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'contratos' AND public.es_admin())
  WITH CHECK (bucket_id = 'contratos' AND public.es_admin());

DROP POLICY IF EXISTS "Inquilino descarga documentos visibles" ON storage.objects;
CREATE POLICY "Inquilino descarga documentos visibles"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'contratos'
    AND (
      public.es_admin()
      OR EXISTS (
        SELECT 1
        FROM public.documentos d
        JOIN public.contratos c ON c.id = d.contrato_id
        WHERE d.url_archivo = name
          AND d.visible_para_inquilino = true
          AND c.inquilino_id = public.obtener_inquilino_id()
          AND c.estado = 'activo'::public.contrato_estado
      )
    )
  );

COMMIT;
