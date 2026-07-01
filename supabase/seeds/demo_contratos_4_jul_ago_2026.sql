-- Demo: 4 contratos activos para presentación.
-- 3 con primer aumento en jul/2026, 1 en ago/2026.
-- Mezcla IPC/ICL, anual y semestral, residencial y comercial.

BEGIN;

DELETE FROM public.aumentos;
DELETE FROM public.documentos WHERE contrato_id IS NOT NULL;

UPDATE public.contratos
SET estado = 'inactivo', activo = false
WHERE estado IN ('activo', 'programado');

DELETE FROM public.contratos;

UPDATE public.propiedades
SET estado = 'Disponible'
WHERE id IN (13, 14, 15, 16);

-- IPC acumulado jul/2025 .. may/2026 (jun/2026 omitido a propósito en contrato semestral)
INSERT INTO public.indices (indice, anio, mes, valor, fuente)
VALUES
  ('ipc', 2025, 7, 2.1, 'seed-demo-4-contratos'),
  ('ipc', 2025, 8, 1.9, 'seed-demo-4-contratos'),
  ('ipc', 2025, 9, 2.5, 'seed-demo-4-contratos'),
  ('ipc', 2025, 10, 2.8, 'seed-demo-4-contratos'),
  ('ipc', 2025, 11, 2.4, 'seed-demo-4-contratos'),
  ('ipc', 2025, 12, 2.6, 'seed-demo-4-contratos'),
  ('ipc', 2026, 1, 2.3, 'seed-demo-4-contratos'),
  ('ipc', 2026, 2, 2.5, 'seed-demo-4-contratos'),
  ('ipc', 2026, 3, 3.1, 'seed-demo-4-contratos'),
  ('ipc', 2026, 4, 2.7, 'seed-demo-4-contratos'),
  ('ipc', 2026, 5, 2.0, 'seed-demo-4-contratos')
ON CONFLICT (indice, anio, mes) WHERE anio IS NOT NULL
DO UPDATE SET valor = EXCLUDED.valor, fuente = EXCLUDED.fuente, fecha_sync = now();

INSERT INTO public.indices (indice, fecha, valor, fuente)
VALUES
  ('icl', '2025-07-01', 22.40, 'seed-demo-4-contratos'),
  ('icl', '2026-07-01', 31.80, 'seed-demo-4-contratos'),
  ('icl', '2025-08-01', 23.10, 'seed-demo-4-contratos'),
  ('icl', '2026-08-01', 32.55, 'seed-demo-4-contratos')
ON CONFLICT (indice, fecha) WHERE fecha IS NOT NULL
DO UPDATE SET valor = EXCLUDED.valor, fuente = EXCLUDED.fuente, fecha_sync = now();

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
  fecha_ultimo_aumento,
  dia_vencimiento,
  observaciones,
  activo,
  estado
)
VALUES
  (
    13, 6,
    '2025-07-01', '2027-06-30',
    420000, 420000, 12, 'ipc'::public.tipo_ajuste_contrato,
    '2026-07-01', NULL, 10,
    'Contrato demo — depto residencial IPC anual (Federico Gonzalez)',
    true, 'activo'::public.contrato_estado
  ),
  (
    15, 1,
    '2025-07-01', '2027-06-30',
    285000, 285000, 12, 'icl'::public.tipo_ajuste_contrato,
    '2026-07-01', NULL, 5,
    'Contrato demo — depto residencial ICL anual (Carlos Gomez)',
    true, 'activo'::public.contrato_estado
  ),
  (
    14, 18,
    '2026-01-01', '2028-12-31',
    385000, 385000, 6, 'ipc'::public.tipo_ajuste_contrato,
    '2026-07-01', NULL, 5,
    'Contrato demo — local comercial IPC semestral (Comercial del Parque)',
    true, 'activo'::public.contrato_estado
  ),
  (
    16, 20,
    '2025-08-01', '2027-07-31',
    295000, 295000, 12, 'icl'::public.tipo_ajuste_contrato,
    '2026-08-01', NULL, 5,
    'Contrato demo — local comercial ICL anual (Lucía Fernández)',
    true, 'activo'::public.contrato_estado
  );

SELECT public.sincronizar_estado_propiedad_por_contratos(id)
FROM public.propiedades
WHERE id IN (13, 14, 15, 16);

COMMIT;
