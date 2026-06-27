-- Linkea el comprobante PDF generado con el aumento puntual que lo originó.
-- Permite acceder al comprobante desde el historial/detalle y limpiarlo al deshacer.
-- ON DELETE SET NULL: si se borra el aumento, el documento no se borra en cascada;
-- el archivo de storage + la fila se eliminan explícitamente desde el servicio.
ALTER TABLE public.documentos
  ADD COLUMN IF NOT EXISTS aumento_id bigint REFERENCES public.aumentos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documentos_aumento_id ON public.documentos(aumento_id);
