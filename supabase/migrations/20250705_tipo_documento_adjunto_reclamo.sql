-- Agrega el valor 'Adjunto de Reclamo' al enum tipo_documento para reutilizar
-- la tabla documentos como soporte de imágenes/archivos adjuntos a un reclamo.
ALTER TYPE public.tipo_documento ADD VALUE IF NOT EXISTS 'Adjunto de Reclamo';
