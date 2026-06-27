-- Reutiliza la tabla documentos para adjuntos de reclamos.
-- contrato_id ya es nullable; propiedad_id (NOT NULL) se completa con la del reclamo.
ALTER TABLE public.documentos
  ADD COLUMN IF NOT EXISTS reclamo_id bigint REFERENCES public.reclamos(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_documentos_reclamo_id ON public.documentos(reclamo_id);
