-- Demo operativa agosto 2026: cartera chica para ver aumentos de septiembre.
-- - 5 contratos con aumento en septiembre (pendientes del período)
-- - 2 rezagados de julio (índices ya publicados → se puede calcular)
-- - 1 contrato activo con próximo aumento en 2027
-- Reclamos: se borran todos y quedan 2 de prueba.

-- 1) Reclamos
DELETE FROM public.documentos WHERE reclamo_id IS NOT NULL;
DELETE FROM public.reclamo_eventos;
DELETE FROM public.reclamos;

-- 2) Dejar activos solo el set de demo
UPDATE public.contratos
SET estado = 'inactivo'::public.contrato_estado
WHERE estado IN ('activo'::public.contrato_estado, 'programado'::public.contrato_estado)
  AND id NOT IN (31, 32, 34, 45, 46, 60, 61);

-- 3) Ajustar los que quedan
-- Septiembre IPC anual — Diego Matías Herrera
UPDATE public.contratos SET
  periodicidad_meses = 12,
  tipo_ajuste = 'ipc'::public.tipo_ajuste_contrato,
  fecha_inicio = '2025-09-01',
  fecha_fin = '2027-08-31',
  fecha_ultimo_aumento = NULL,
  fecha_proximo_aumento = '2026-09-01',
  monto_alquiler = 305000,
  monto_inicial = 305000,
  dia_vencimiento = 10,
  observaciones = 'Demo sept 2026 — IPC anual'
WHERE id = 60;

-- Septiembre ICL semestral — Estudio Contable Rivadavia
UPDATE public.contratos SET
  periodicidad_meses = 6,
  tipo_ajuste = 'icl'::public.tipo_ajuste_contrato,
  fecha_inicio = '2025-09-01',
  fecha_fin = '2027-08-31',
  fecha_ultimo_aumento = '2026-03-01',
  fecha_proximo_aumento = '2026-09-01',
  monto_alquiler = 498000,
  monto_inicial = 450000,
  dia_vencimiento = 5,
  observaciones = 'Demo sept 2026 — ICL semestral'
WHERE id = 61;

-- Septiembre IPC trimestral — Camila Ríos
UPDATE public.contratos SET
  periodicidad_meses = 3,
  tipo_ajuste = 'ipc'::public.tipo_ajuste_contrato,
  fecha_inicio = '2026-06-01',
  fecha_fin = '2028-05-31',
  fecha_ultimo_aumento = NULL,
  fecha_proximo_aumento = '2026-09-01',
  monto_alquiler = 340000,
  monto_inicial = 340000,
  dia_vencimiento = 10,
  observaciones = 'Demo sept 2026 — IPC trimestral'
WHERE id = 46;

-- Septiembre ICL semestral — Clínica del Sol
UPDATE public.contratos SET
  periodicidad_meses = 6,
  tipo_ajuste = 'icl'::public.tipo_ajuste_contrato,
  fecha_inicio = '2026-03-01',
  fecha_fin = '2028-02-29',
  fecha_ultimo_aumento = NULL,
  fecha_proximo_aumento = '2026-09-01',
  monto_alquiler = 720000,
  monto_inicial = 720000,
  dia_vencimiento = 5,
  observaciones = 'Demo sept 2026 — ICL semestral'
WHERE id = 45;

-- Rezagado julio IPC trimestral — Federico Gonzalez (meses abr-jun ya publicados)
UPDATE public.contratos SET
  periodicidad_meses = 3,
  tipo_ajuste = 'ipc'::public.tipo_ajuste_contrato,
  fecha_inicio = '2026-04-01',
  fecha_fin = '2028-03-31',
  fecha_ultimo_aumento = NULL,
  fecha_proximo_aumento = '2026-07-01',
  monto_alquiler = 335000,
  monto_inicial = 335000,
  dia_vencimiento = 10,
  observaciones = 'Demo rezagado jul 2026 — IPC trimestral'
WHERE id = 34;

-- Rezagado julio ICL anual — Lucía Fernández
UPDATE public.contratos SET
  periodicidad_meses = 12,
  tipo_ajuste = 'icl'::public.tipo_ajuste_contrato,
  fecha_inicio = '2025-07-01',
  fecha_fin = '2027-06-30',
  fecha_ultimo_aumento = NULL,
  fecha_proximo_aumento = '2026-07-01',
  monto_alquiler = 295000,
  monto_inicial = 295000,
  dia_vencimiento = 5,
  observaciones = 'Demo rezagado jul 2026 — ICL anual'
WHERE id = 32;

-- Próximo aumento 2027 — Comercial del Parque (ya actualizado en julio)
UPDATE public.contratos SET
  observaciones = 'Demo — próximo aumento ene 2027 (ya actualizado en jul 2026)'
WHERE id = 31;

-- 4) Dueños, inmuebles e inquilino nuevos
INSERT INTO public.propietarios (nombre_completo, dni_cuit, tipo_persona, telefono, email, domicilio)
VALUES
  (
    'Silvia Beatriz Molina',
    '27160987456',
    'Física'::public.tipo_persona_enum,
    '351-487-2210',
    'silvia.molina@correo.com',
    'Av. Colón 1650, Córdoba'
  ),
  (
    'Grupo Alberdi S.A.',
    '30717894561',
    'Jurídica'::public.tipo_persona_enum,
    '351-422-9088',
    'admin@grupoalberdi.com',
    'Bv. San Juan 450, Córdoba'
  )
ON CONFLICT (dni_cuit) DO UPDATE
SET nombre_completo = EXCLUDED.nombre_completo,
    telefono = EXCLUDED.telefono,
    email = EXCLUDED.email,
    domicilio = EXCLUDED.domicilio,
    tipo_persona = EXCLUDED.tipo_persona;

INSERT INTO public.inquilinos (
  nombre_completo, dni_cuit, tipo_persona, telefono, email, ocupacion, estado_civil
)
VALUES (
  'Natalia Soledad Ruiz',
  '27401239876',
  'Física'::public.tipo_persona_enum,
  '351-611-4477',
  'natalia.ruiz@correo.com',
  'Arquitecta',
  'Soltera'
)
ON CONFLICT (dni_cuit) DO UPDATE
SET nombre_completo = EXCLUDED.nombre_completo,
    telefono = EXCLUDED.telefono,
    email = EXCLUDED.email,
    ocupacion = EXCLUDED.ocupacion,
    estado_civil = EXCLUDED.estado_civil;

INSERT INTO public.propiedades (
  propietario_id, calle, altura, piso, unidad, ciudad,
  calle_norm, altura_norm, piso_norm, unidad_norm, ciudad_norm,
  direccion, tipo, estado
)
SELECT
  p.id,
  'Achával Rodríguez', '1480', '3', 'B', 'Córdoba',
  'achaval rodriguez', '1480', '3', 'B', 'cordoba',
  'Achával Rodríguez 1480, Piso 3, Depto B, Córdoba',
  'Departamento',
  'Disponible'::public.propiedad_estado
FROM public.propietarios p
WHERE p.dni_cuit = '27160987456'
  AND NOT EXISTS (
    SELECT 1 FROM public.propiedades x
    WHERE x.calle_norm = 'achaval rodriguez' AND x.altura_norm = '1480'
      AND x.piso_norm = '3' AND x.unidad_norm = 'B' AND x.ciudad_norm = 'cordoba'
  );

INSERT INTO public.propiedades (
  propietario_id, calle, altura, piso, unidad, ciudad,
  calle_norm, altura_norm, piso_norm, unidad_norm, ciudad_norm,
  direccion, tipo, estado
)
SELECT
  p.id,
  'Av. Vélez Sársfield', '2150', 'PB', 'Local 2', 'Córdoba',
  'av velez sarsfield', '2150', '', 'LOCAL 2', 'cordoba',
  'Av. Vélez Sársfield 2150, PB, Local 2, Córdoba',
  'Local comercial',
  'Disponible'::public.propiedad_estado
FROM public.propietarios p
WHERE p.dni_cuit = '30717894561'
  AND NOT EXISTS (
    SELECT 1 FROM public.propiedades x
    WHERE x.calle_norm = 'av velez sarsfield' AND x.altura_norm = '2150'
      AND x.piso_norm = '' AND x.unidad_norm = 'LOCAL 2' AND x.ciudad_norm = 'cordoba'
  );

-- 5) Contrato septiembre en el depto nuevo
INSERT INTO public.contratos (
  propiedad_id, inquilino_id, fecha_inicio, fecha_fin,
  monto_alquiler, monto_inicial, periodicidad_meses, tipo_ajuste,
  fecha_proximo_aumento, dia_vencimiento, observaciones, estado
)
SELECT
  pr.id,
  i.id,
  '2026-06-01',
  '2028-05-31',
  280000,
  280000,
  3,
  'ipc'::public.tipo_ajuste_contrato,
  '2026-09-01',
  10,
  'Demo sept 2026 — IPC trimestral (Natalia Ruiz)',
  'activo'::public.contrato_estado
FROM public.propiedades pr
JOIN public.inquilinos i ON i.dni_cuit = '27401239876'
WHERE pr.calle_norm = 'achaval rodriguez'
  AND pr.altura_norm = '1480'
  AND pr.piso_norm = '3'
  AND pr.unidad_norm = 'B'
  AND NOT EXISTS (
    SELECT 1 FROM public.contratos c
    WHERE c.observaciones = 'Demo sept 2026 — IPC trimestral (Natalia Ruiz)'
      AND c.estado = 'activo'::public.contrato_estado
  );

-- 6) Dos reclamos de prueba sobre contratos de septiembre
INSERT INTO public.reclamos (
  propiedad_id, inquilino_id, contrato_id, titulo, descripcion,
  estado, prioridad, categoria, fecha_creacion
)
SELECT
  c.propiedad_id, c.inquilino_id, c.id,
  'Pérdida de agua en cocina',
  'Reclamo de prueba — goteo en la canilla de la mesada. El inquilino avisó el fin de semana.',
  'Pendiente'::public.reclamo_estado,
  'Urgente'::public.reclamo_prioridad,
  'Plomeria'::public.reclamo_categoria,
  now() - interval '1 day'
FROM public.contratos c
WHERE c.id = 60;

INSERT INTO public.reclamos (
  propiedad_id, inquilino_id, contrato_id, titulo, descripcion,
  estado, prioridad, categoria, fecha_creacion
)
SELECT
  c.propiedad_id, c.inquilino_id, c.id,
  'Luces del hall de entrada',
  'Reclamo de prueba — no encienden las luces del hall. El resto de la oficina funciona.',
  'En Proceso'::public.reclamo_estado,
  'Media'::public.reclamo_prioridad,
  'Electricidad'::public.reclamo_categoria,
  now() - interval '3 days'
FROM public.contratos c
WHERE c.id = 61;
