-- Nuevo tipo de documento para los comprobantes de aumento generados al confirmar.
ALTER TYPE public.tipo_documento ADD VALUE IF NOT EXISTS 'Comprobante de Aumento';
