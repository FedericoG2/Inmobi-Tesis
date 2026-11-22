-- Esquema mínimo para las pruebas de la base (tests/db).
-- Las tablas siguen el DER del informe (sección 3.9). Las funciones, triggers y políticas no se
-- escriben acá: se toman de supabase/migrations/ (ver cargarBase.js), así se prueba el SQL real.
-- Reemplaza lo que en Supabase ya viene dado: los roles, auth.users y auth.uid().

CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role;

CREATE SCHEMA auth;
CREATE TABLE auth.users (
  id uuid PRIMARY KEY,
  email text,
  raw_app_meta_data jsonb DEFAULT '{}'::jsonb
);
-- El usuario de la sesión sale de la variable prueba.uid (en Supabase, del JWT).
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('prueba.uid', true), '')::uuid
$$;

CREATE TYPE public.user_role AS ENUM ('admin', 'inquilino', 'encargado');
CREATE TYPE public.tipo_persona_enum AS ENUM ('Física', 'Jurídica');
CREATE TYPE public.propiedad_estado AS ENUM ('Disponible', 'Reservada', 'Alquilada', 'Mantenimiento');
CREATE TYPE public.contrato_estado AS ENUM ('programado', 'activo', 'inactivo');
CREATE TYPE public.tipo_ajuste_contrato AS ENUM ('manual', 'porcentaje_fijo', 'icl', 'ipc');
CREATE TYPE public.indice_referencia AS ENUM ('icl', 'ipc');
CREATE TYPE public.reclamo_estado AS ENUM ('Pendiente', 'En Proceso', 'Revision', 'Resuelto');
CREATE TYPE public.reclamo_prioridad AS ENUM ('Baja', 'Media', 'Alta', 'Urgente');

CREATE TABLE public.perfiles (
  id uuid PRIMARY KEY,
  rol public.user_role NOT NULL,
  fecha_creacion timestamptz DEFAULT now()
);

CREATE TABLE public.propietarios (
  id bigserial PRIMARY KEY,
  nombre_completo text NOT NULL,
  dni_cuit text NOT NULL UNIQUE,
  tipo_persona public.tipo_persona_enum NOT NULL DEFAULT 'Física',
  telefono text,
  email text,
  domicilio text,
  fecha_creacion timestamptz DEFAULT now()
);

CREATE TABLE public.propiedades (
  id bigserial PRIMARY KEY,
  propietario_id bigint REFERENCES public.propietarios (id) ON DELETE RESTRICT,
  direccion text,
  calle text,
  altura text,
  piso text,
  unidad text,
  ciudad text,
  tipo text,
  estado public.propiedad_estado NOT NULL DEFAULT 'Disponible',
  calle_norm text, altura_norm text, piso_norm text, unidad_norm text, ciudad_norm text,
  fecha_creacion timestamptz DEFAULT now()
);

CREATE TABLE public.inquilinos (
  id bigserial PRIMARY KEY,
  perfil_id uuid UNIQUE,
  nombre_completo text NOT NULL,
  dni_cuit text NOT NULL UNIQUE,
  tipo_persona public.tipo_persona_enum NOT NULL DEFAULT 'Física',
  telefono text,
  email text,
  fecha_nacimiento date,
  estado_civil text,
  ocupacion text,
  emergencia_nombre text,
  emergencia_telefono text,
  observaciones text,
  fecha_creacion timestamptz DEFAULT now()
);

-- Incluye la columna activo de versiones anteriores: la migración 20261029 la quita.
CREATE TABLE public.contratos (
  id bigserial PRIMARY KEY,
  propiedad_id bigint NOT NULL REFERENCES public.propiedades (id) ON DELETE CASCADE,
  inquilino_id bigint NOT NULL REFERENCES public.inquilinos (id) ON DELETE CASCADE,
  fecha_inicio date NOT NULL,
  fecha_fin date NOT NULL,
  monto_inicial numeric,
  monto_alquiler numeric NOT NULL,
  periodicidad_meses integer NOT NULL DEFAULT 12,
  tipo_ajuste public.tipo_ajuste_contrato NOT NULL DEFAULT 'ipc',
  dia_vencimiento smallint,
  fecha_proximo_aumento date,
  fecha_ultimo_aumento date,
  observaciones text,
  estado public.contrato_estado NOT NULL DEFAULT 'activo',
  activo boolean DEFAULT true,
  fecha_creacion timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.indices (
  id bigserial PRIMARY KEY,
  indice public.indice_referencia,
  fecha date,
  anio integer,
  mes integer,
  valor numeric
);

CREATE TABLE public.aumentos (
  id bigserial PRIMARY KEY,
  contrato_id bigint NOT NULL REFERENCES public.contratos (id) ON DELETE RESTRICT,
  fecha_aplicacion date NOT NULL,
  monto_anterior numeric NOT NULL CHECK (monto_anterior >= 0),
  monto_nuevo numeric NOT NULL CHECK (monto_nuevo >= 0),
  porcentaje_aplicado numeric,
  indice_tipo public.indice_referencia,
  indice_valor_inicio numeric,
  indice_valor_fin numeric,
  modo text NOT NULL CHECK (modo IN ('calculado', 'manual', 'porcentaje_fijo')),
  notas text,
  detalle_calculo jsonb,
  aplicado boolean NOT NULL DEFAULT true,
  fecha_creacion timestamptz DEFAULT now()
);

CREATE TABLE public.reclamos (
  id bigserial PRIMARY KEY,
  propiedad_id bigint NOT NULL REFERENCES public.propiedades (id) ON DELETE CASCADE,
  inquilino_id bigint NOT NULL REFERENCES public.inquilinos (id) ON DELETE CASCADE,
  contrato_id bigint REFERENCES public.contratos (id) ON DELETE SET NULL,
  titulo text NOT NULL,
  descripcion text,
  categoria text,
  prioridad public.reclamo_prioridad NOT NULL DEFAULT 'Media',
  estado public.reclamo_estado NOT NULL DEFAULT 'Pendiente',
  fecha_creacion timestamptz DEFAULT now()
);

CREATE TABLE public.reclamo_eventos (
  id bigserial PRIMARY KEY,
  reclamo_id bigint NOT NULL REFERENCES public.reclamos (id) ON DELETE CASCADE,
  estado_anterior public.reclamo_estado,
  estado_nuevo public.reclamo_estado,
  comentario text,
  creado_por uuid,
  fecha_creacion timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.documentos (
  id bigserial PRIMARY KEY,
  propiedad_id bigint REFERENCES public.propiedades (id) ON DELETE CASCADE,
  contrato_id bigint REFERENCES public.contratos (id) ON DELETE CASCADE,
  reclamo_id bigint REFERENCES public.reclamos (id) ON DELETE CASCADE,
  aumento_id bigint REFERENCES public.aumentos (id) ON DELETE SET NULL,
  nombre text,
  categoria text,
  url_archivo text,
  visible_para_inquilino boolean NOT NULL DEFAULT false,
  fecha_subida timestamptz DEFAULT now()
);

-- Vistas de versiones anteriores que la migración 20261029 quita.
CREATE VIEW public.dashboard_inquilino_resumen AS
  SELECT i.id, c.monto_alquiler
  FROM public.inquilinos i
  LEFT JOIN public.contratos c ON i.id = c.inquilino_id AND c.activo = true;
CREATE VIEW public.dashboard_ipc_anual AS
  SELECT anio, mes, valor FROM public.indices WHERE indice = 'ipc';

-- Storage mínimo: buckets, objetos y storage.foldername() como en Supabase, para probar
-- las políticas de los archivos (contratos, adjuntos y comprobantes de pago).
CREATE SCHEMA storage;
CREATE TABLE storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  public boolean DEFAULT false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
CREATE TABLE storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text REFERENCES storage.buckets (id),
  name text NOT NULL,
  owner uuid,
  owner_id text,
  created_at timestamptz DEFAULT now()
);
CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
$$;
INSERT INTO storage.buckets (id, name) VALUES ('contratos', 'contratos');
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA storage TO anon, authenticated;
GRANT SELECT, INSERT, DELETE ON storage.objects TO authenticated;
GRANT SELECT ON storage.buckets TO authenticated;

-- Permisos que Supabase da por defecto; las migraciones después los recortan.
GRANT USAGE ON SCHEMA public, auth TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
-- Como Supabase: las tablas y vistas que crean las migraciones también quedan con permisos.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;

ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.propietarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.propiedades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquilinos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aumentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reclamos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reclamo_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
