-- Dos contratos demo: primer aumento en julio 2026.
-- Federico Gonzalez (6) — IPC | Carlos Gomez (1) — ICL

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

INSERT INTO public.indices (indice, anio, mes, valor, fuente)
VALUES
  ('ipc', 2025, 7, 2.1, 'seed-aumentos-jul2026'),
  ('ipc', 2025, 8, 1.9, 'seed-aumentos-jul2026'),
  ('ipc', 2025, 9, 2.5, 'seed-aumentos-jul2026'),
  ('ipc', 2025, 10, 2.8, 'seed-aumentos-jul2026'),
  ('ipc', 2025, 11, 2.4, 'seed-aumentos-jul2026'),
  ('ipc', 2025, 12, 2.6, 'seed-aumentos-jul2026'),
  ('ipc', 2026, 1, 2.3, 'seed-aumentos-jul2026'),
  ('ipc', 2026, 2, 2.5, 'seed-aumentos-jul2026'),
  ('ipc', 2026, 3, 3.1, 'seed-aumentos-jul2026'),
  ('ipc', 2026, 4, 2.7, 'seed-aumentos-jul2026'),
  ('ipc', 2026, 5, 2.0, 'seed-aumentos-jul2026'),
  ('ipc', 2026, 6, 1.8, 'seed-aumentos-jul2026')
ON CONFLICT (indice, anio, mes) WHERE anio IS NOT NULL
DO UPDATE SET valor = EXCLUDED.valor, fuente = EXCLUDED.fuente, fecha_sync = now();

INSERT INTO public.indices (indice, fecha, valor, fuente)
VALUES
  ('icl', '2025-07-01', 22.40, 'seed-aumentos-jul2026'),
  ('icl', '2026-07-01', 31.80, 'seed-aumentos-jul2026')
ON CONFLICT (indice, fecha) WHERE fecha IS NOT NULL
DO UPDATE SET valor = EXCLUDED.valor, fuente = EXCLUDED.fuente, fecha_sync = now();

INSERT INTO public.contratos (
  propiedad_id, inquilino_id, fecha_inicio, fecha_fin,
  monto_alquiler, monto_inicial, periodicidad_meses, tipo_ajuste,
  fecha_proximo_aumento, dia_vencimiento, observaciones, activo
)
VALUES
  (
    13, 6, '2025-07-01', '2027-06-30',
    420000, 420000, 12, 'ipc',
    '2026-07-01', 10,
    'Contrato demo — Federico Gonzalez IPC',
    true
  ),
  (
    15, 1, '2025-07-01', '2027-06-30',
    310000, 310000, 12, 'icl',
    '2026-07-01', 5,
    'Contrato demo — Carlos Gomez ICL',
    true
  );

COMMIT;
