-- Demo: Comercial del Parque S.A. — local Av. Rafael Núñez 2840
-- IPC semestral, sin aumentos confirmados, primer aumento 01/07/2026.
-- Inquilino id 18 | Propiedad id 14

BEGIN;

DELETE FROM public.aumentos
WHERE contrato_id IN (
  SELECT id FROM public.contratos
  WHERE observaciones = 'Contrato demo — Comercial del Parque IPC cronograma jul 2026'
);

DELETE FROM public.contratos
WHERE observaciones = 'Contrato demo — Comercial del Parque IPC cronograma jul 2026';

-- NOTA: no se carga junio 2026 a propósito. El IPC de junio recién se publica
-- a mediados de julio, así el aumento del 01/07/2026 queda como "Provisorio"
-- (valor estimado) tal como pasaría en la realidad.
INSERT INTO public.indices (indice, anio, mes, valor, fuente)
VALUES
  ('ipc', 2026, 1, 2.3, 'seed-parque-ipc-jul2026'),
  ('ipc', 2026, 2, 2.5, 'seed-parque-ipc-jul2026'),
  ('ipc', 2026, 3, 3.1, 'seed-parque-ipc-jul2026'),
  ('ipc', 2026, 4, 2.7, 'seed-parque-ipc-jul2026'),
  ('ipc', 2026, 5, 2.0, 'seed-parque-ipc-jul2026')
ON CONFLICT (indice, anio, mes) WHERE anio IS NOT NULL
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
VALUES (
  14,
  18,
  '2026-01-01'::date,
  '2028-12-31'::date,
  350000,
  350000,
  6,
  'ipc'::public.tipo_ajuste_contrato,
  '2026-07-01'::date,
  NULL,
  5,
  'Contrato demo — Comercial del Parque IPC cronograma jul 2026',
  true,
  'activo'::public.contrato_estado
);

SELECT public.sincronizar_estado_propiedad_por_contratos(14);

COMMIT;
