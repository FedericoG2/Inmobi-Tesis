-- Configuración única de la inmobiliaria (ficha de contratos, documentos internos).

BEGIN;

CREATE TABLE IF NOT EXISTS public.config_inmobiliaria (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  razon_social text NOT NULL DEFAULT '',
  nombre_fantasia text NOT NULL DEFAULT '',
  cuit text,
  domicilio text NOT NULL DEFAULT '',
  ciudad text NOT NULL DEFAULT 'Córdoba',
  email text NOT NULL DEFAULT '',
  telefono text,
  corredor_nombre text,
  corredor_matricula text,
  honorarios_locatario_pct numeric(5, 2) NOT NULL DEFAULT 2,
  lugar_pago text,
  horario_pago text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.config_inmobiliaria (
  id,
  razon_social,
  nombre_fantasia,
  domicilio,
  ciudad,
  email,
  honorarios_locatario_pct,
  lugar_pago,
  horario_pago
)
VALUES (
  1,
  '',
  'INMOBI',
  '',
  'Córdoba',
  '',
  2,
  NULL,
  'Lunes a viernes de 9:30 a 16:00 hs'
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.config_inmobiliaria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin CRUD config_inmobiliaria" ON public.config_inmobiliaria;
CREATE POLICY "Admin CRUD config_inmobiliaria"
  ON public.config_inmobiliaria FOR ALL TO authenticated
  USING (public.es_admin())
  WITH CHECK (public.es_admin());

COMMIT;
