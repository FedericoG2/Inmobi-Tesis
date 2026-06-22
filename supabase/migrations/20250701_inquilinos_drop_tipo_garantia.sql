-- Elimina tipo_garantia de inquilinos (fuera de alcance actual).
-- Columna usada solo en el front admin; no hay FKs ni RPCs que la referencien.

ALTER TABLE public.inquilinos
  DROP COLUMN IF EXISTS tipo_garantia;
