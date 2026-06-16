-- Dos contratos de ejemplo para desarrollo y demos.
-- Requiere: inquilinos 6 y 18, propiedades 13 y 14.

BEGIN;

DELETE FROM public.contratos
WHERE observaciones LIKE 'Contrato demo —%';

-- 1) Residencial IPC — Federico Gonzalez + Av. Hipólito Yrigoyen 1200
INSERT INTO public.contratos (
  propiedad_id,
  inquilino_id,
  fecha_inicio,
  fecha_fin,
  monto_alquiler,
  monto_inicial,
  periodicidad_meses,
  tipo_ajuste,
  fecha_proximo_aumento,
  dia_vencimiento,
  observaciones,
  activo
)
VALUES (
  13,
  6,
  '2025-02-01'::date,
  '2028-01-31'::date,
  195000,
  195000,
  12,
  'ipc'::public.tipo_ajuste_contrato,
  '2026-02-01'::date,
  10,
  'Contrato demo — alquiler residencial IPC (Federico Gonzalez)',
  true
);

-- 2) Comercial ICL — Comercial del Parque S.A. + Av. Rafael Núñez 2840
INSERT INTO public.contratos (
  propiedad_id,
  inquilino_id,
  fecha_inicio,
  fecha_fin,
  monto_alquiler,
  monto_inicial,
  periodicidad_meses,
  tipo_ajuste,
  fecha_proximo_aumento,
  dia_vencimiento,
  observaciones,
  activo
)
VALUES (
  14,
  18,
  '2025-04-01'::date,
  '2028-03-31'::date,
  380000,
  380000,
  12,
  'icl'::public.tipo_ajuste_contrato,
  '2026-04-01'::date,
  5,
  'Contrato demo — local comercial ICL (Comercial del Parque S.A.)',
  true
);

INSERT INTO public.indices (indice, fecha, valor, fuente)
VALUES
  ('icl', '2025-04-01', 18.42, 'seed-demo'),
  ('icl', '2026-04-01', 28.75, 'seed-demo')
ON CONFLICT (indice, fecha) WHERE fecha IS NOT NULL
DO UPDATE SET valor = EXCLUDED.valor, fuente = EXCLUDED.fuente, fecha_sync = now();

INSERT INTO public.indices (indice, anio, mes, valor, fuente)
VALUES
  ('ipc', 2025, 2, 2.4, 'seed-demo'),
  ('ipc', 2025, 3, 3.7, 'seed-demo'),
  ('ipc', 2025, 4, 2.8, 'seed-demo'),
  ('ipc', 2025, 5, 1.5, 'seed-demo'),
  ('ipc', 2025, 6, 1.6, 'seed-demo'),
  ('ipc', 2025, 7, 1.9, 'seed-demo'),
  ('ipc', 2025, 8, 3.0, 'seed-demo'),
  ('ipc', 2025, 9, 2.1, 'seed-demo'),
  ('ipc', 2025, 10, 2.5, 'seed-demo'),
  ('ipc', 2025, 11, 2.4, 'seed-demo'),
  ('ipc', 2025, 12, 2.5, 'seed-demo'),
  ('ipc', 2026, 1, 2.2, 'seed-demo')
ON CONFLICT (indice, anio, mes) WHERE anio IS NOT NULL
DO UPDATE SET valor = EXCLUDED.valor, fuente = EXCLUDED.fuente, fecha_sync = now();

-- 3) Departamento IPC — Carlos Gomez + Bv. Chacabuco 1250 (sin documentos adjuntos)
UPDATE public.propiedades
SET estado = 'Disponible'
WHERE id = 16
  AND estado = 'Mantenimiento';

INSERT INTO public.contratos (
  propiedad_id,
  inquilino_id,
  fecha_inicio,
  fecha_fin,
  monto_alquiler,
  monto_inicial,
  periodicidad_meses,
  tipo_ajuste,
  fecha_proximo_aumento,
  dia_vencimiento,
  observaciones,
  activo
)
SELECT
  15,
  1,
  '2025-06-01'::date,
  '2028-05-31'::date,
  245000,
  245000,
  12,
  'ipc'::public.tipo_ajuste_contrato,
  '2026-06-01'::date,
  10,
  'Contrato demo — departamento IPC (Carlos Gomez)',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.contratos
  WHERE observaciones = 'Contrato demo — departamento IPC (Carlos Gomez)'
);

-- 4) Local comercial IPC — Federico Gonzalez + Av. Duarte Quirós 1200 (sin documentos adjuntos)
INSERT INTO public.contratos (
  propiedad_id,
  inquilino_id,
  fecha_inicio,
  fecha_fin,
  monto_alquiler,
  monto_inicial,
  periodicidad_meses,
  tipo_ajuste,
  fecha_proximo_aumento,
  dia_vencimiento,
  observaciones,
  activo
)
SELECT
  16,
  6,
  '2025-08-01'::date,
  '2028-07-31'::date,
  310000,
  310000,
  12,
  'ipc'::public.tipo_ajuste_contrato,
  '2026-08-01'::date,
  5,
  'Contrato demo — local comercial IPC (Federico Gonzalez)',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.contratos
  WHERE observaciones = 'Contrato demo — local comercial IPC (Federico Gonzalez)'
);

COMMIT;
