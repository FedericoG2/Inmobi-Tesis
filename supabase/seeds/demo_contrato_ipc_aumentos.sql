-- Seed demo: contrato IPC vencido para probar módulo Aumentos vs ARquiler
-- Propiedad: Av. Fabricio E. Carrascull 621, Córdoba (id 8) | Inquilino: Federico Gonzalez (id 6)
-- Período IPC: jun/2024 .. may/2025 (12 meses) sobre monto $150.000
-- Monto esperado aprox (Argly): round(150000 * factor compuesto) ≈ $215.225

BEGIN;

-- Reemplazar contrato IPC previo en esta propiedad (solo demo)
DELETE FROM public.contratos
WHERE propiedad_id = 8
  AND tipo_ajuste = 'ipc'::public.tipo_ajuste_contrato
  AND (
    observaciones LIKE 'Contrato demo IPC%'
    OR id IN (SELECT id FROM public.contratos WHERE propiedad_id = 8 AND tipo_ajuste = 'ipc' AND activo = true)
  );

UPDATE public.propiedades
SET estado = 'Alquilada'
WHERE id = 8;

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
  activo
)
VALUES (
  8,
  6,
  '2024-06-01'::date,
  '2027-05-31'::date,
  150000,
  150000,
  12,
  'ipc'::public.tipo_ajuste_contrato,
  '2025-06-01'::date,
  NULL,
  5,
  'Contrato demo IPC — prueba módulo aumentos (vencido)',
  true
);

-- IPC mensual de referencia (Argly); el sync también puede sobrescribir
INSERT INTO public.indices (indice, anio, mes, valor, fuente)
VALUES
  ('ipc', 2024, 6, 4.6, 'seed-demo'),
  ('ipc', 2024, 7, 4.0, 'seed-demo'),
  ('ipc', 2024, 8, 4.2, 'seed-demo'),
  ('ipc', 2024, 9, 3.5, 'seed-demo'),
  ('ipc', 2024, 10, 2.7, 'seed-demo'),
  ('ipc', 2024, 11, 2.4, 'seed-demo'),
  ('ipc', 2024, 12, 2.7, 'seed-demo'),
  ('ipc', 2025, 1, 2.2, 'seed-demo'),
  ('ipc', 2025, 2, 2.4, 'seed-demo'),
  ('ipc', 2025, 3, 3.7, 'seed-demo'),
  ('ipc', 2025, 4, 2.8, 'seed-demo'),
  ('ipc', 2025, 5, 1.5, 'seed-demo')
ON CONFLICT (indice, anio, mes) WHERE anio IS NOT NULL
DO UPDATE SET
  valor = EXCLUDED.valor,
  fuente = EXCLUDED.fuente,
  fecha_sync = now();

COMMIT;
