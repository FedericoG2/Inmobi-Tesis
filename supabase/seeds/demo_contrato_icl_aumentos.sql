-- Seed demo: contrato ICL vencido para probar módulo Aumentos
-- Propiedad: Av. Colón 4500, Córdoba (id 9) | Inquilino: Federico Gonzalez (id 6)
-- Monto esperado al calcular: round(150000 * 25.16 / 10.80) = 349444

BEGIN;

UPDATE public.propiedades
SET estado = 'Alquilada'
WHERE id = 9;

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
SELECT
  9,
  6,
  '2024-06-01'::date,
  '2027-05-31'::date,
  150000,
  150000,
  12,
  'icl'::public.tipo_ajuste_contrato,
  '2025-06-01'::date,
  NULL,
  5,
  'Contrato demo ICL — prueba módulo aumentos (vencido)',
  true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.contratos
  WHERE propiedad_id = 9
    AND activo = true
    AND observaciones LIKE 'Contrato demo ICL%'
);

INSERT INTO public.indices (indice, fecha, valor, fuente)
VALUES
  ('icl', '2024-06-01', 10.80, 'seed-demo'),
  ('icl', '2025-06-01', 25.16, 'seed-demo')
ON CONFLICT (indice, fecha) WHERE fecha IS NOT NULL
DO UPDATE SET
  valor = EXCLUDED.valor,
  fuente = EXCLUDED.fuente,
  fecha_sync = now();

COMMIT;
