-- Contrato demo: IPC trimestral con primer aumento en jul/2026 y varios ciclos futuros.
-- Inquilino: Federico Gonzalez (6) · Propiedad: Antonio del viso 740 (22)
-- No borra otros contratos. Idempotente por observaciones.

BEGIN;

-- IPC para cálculos trimestrales (jun/2026 en adelante)
INSERT INTO public.indices (indice, anio, mes, valor, fuente)
VALUES
  ('ipc', 2026, 6, 2.4, 'seed-trimestral-jul2026'),
  ('ipc', 2026, 7, 2.2, 'seed-trimestral-jul2026'),
  ('ipc', 2026, 8, 2.0, 'seed-trimestral-jul2026'),
  ('ipc', 2026, 9, 2.3, 'seed-trimestral-jul2026'),
  ('ipc', 2026, 10, 2.5, 'seed-trimestral-jul2026'),
  ('ipc', 2026, 11, 2.1, 'seed-trimestral-jul2026'),
  ('ipc', 2026, 12, 2.6, 'seed-trimestral-jul2026'),
  ('ipc', 2027, 1, 2.4, 'seed-trimestral-jul2026'),
  ('ipc', 2027, 2, 2.2, 'seed-trimestral-jul2026'),
  ('ipc', 2027, 3, 2.8, 'seed-trimestral-jul2026'),
  ('ipc', 2027, 4, 2.5, 'seed-trimestral-jul2026'),
  ('ipc', 2027, 5, 2.0, 'seed-trimestral-jul2026'),
  ('ipc', 2027, 6, 2.3, 'seed-trimestral-jul2026'),
  ('ipc', 2027, 7, 2.1, 'seed-trimestral-jul2026'),
  ('ipc', 2027, 8, 2.4, 'seed-trimestral-jul2026'),
  ('ipc', 2027, 9, 2.2, 'seed-trimestral-jul2026'),
  ('ipc', 2027, 10, 2.6, 'seed-trimestral-jul2026'),
  ('ipc', 2027, 11, 2.3, 'seed-trimestral-jul2026'),
  ('ipc', 2027, 12, 2.5, 'seed-trimestral-jul2026'),
  ('ipc', 2028, 1, 2.2, 'seed-trimestral-jul2026'),
  ('ipc', 2028, 2, 2.0, 'seed-trimestral-jul2026'),
  ('ipc', 2028, 3, 2.4, 'seed-trimestral-jul2026'),
  ('ipc', 2028, 4, 2.3, 'seed-trimestral-jul2026'),
  ('ipc', 2028, 5, 2.1, 'seed-trimestral-jul2026'),
  ('ipc', 2028, 6, 2.5, 'seed-trimestral-jul2026'),
  ('ipc', 2028, 7, 2.2, 'seed-trimestral-jul2026'),
  ('ipc', 2028, 8, 2.4, 'seed-trimestral-jul2026'),
  ('ipc', 2028, 9, 2.1, 'seed-trimestral-jul2026'),
  ('ipc', 2028, 10, 2.3, 'seed-trimestral-jul2026'),
  ('ipc', 2028, 11, 2.2, 'seed-trimestral-jul2026'),
  ('ipc', 2028, 12, 2.6, 'seed-trimestral-jul2026'),
  ('ipc', 2029, 1, 2.4, 'seed-trimestral-jul2026'),
  ('ipc', 2029, 2, 2.1, 'seed-trimestral-jul2026'),
  ('ipc', 2029, 3, 2.5, 'seed-trimestral-jul2026')
ON CONFLICT (indice, anio, mes) WHERE anio IS NOT NULL
DO UPDATE SET valor = EXCLUDED.valor, fuente = EXCLUDED.fuente, fecha_sync = now();

DELETE FROM public.aumentos
WHERE contrato_id IN (
  SELECT id FROM public.contratos
  WHERE observaciones = 'Contrato demo — IPC trimestral multi-aumento (Federico Gonzalez)'
);

DELETE FROM public.documentos
WHERE contrato_id IN (
  SELECT id FROM public.contratos
  WHERE observaciones = 'Contrato demo — IPC trimestral multi-aumento (Federico Gonzalez)'
);

DELETE FROM public.contratos
WHERE observaciones = 'Contrato demo — IPC trimestral multi-aumento (Federico Gonzalez)';

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
VALUES (
  22,
  6,
  '2026-04-01',
  '2029-03-31',
  335000,
  335000,
  3,
  'ipc'::public.tipo_ajuste_contrato,
  '2026-07-01',
  NULL,
  5,
  'Contrato demo — IPC trimestral multi-aumento (Federico Gonzalez)',
  true,
  'activo'::public.contrato_estado
);

SELECT public.sincronizar_estado_propiedad_por_contratos(22);

COMMIT;
