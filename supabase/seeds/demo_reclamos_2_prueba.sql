-- Dos reclamos de prueba vinculados a contratos activos.
-- Idempotente por prefijo en descripcion.

BEGIN;

DELETE FROM public.reclamo_eventos
WHERE reclamo_id IN (
  SELECT id FROM public.reclamos WHERE descripcion LIKE 'Reclamo demo —%'
);

DELETE FROM public.reclamos
WHERE descripcion LIKE 'Reclamo demo —%';

INSERT INTO public.reclamos (
  propiedad_id,
  inquilino_id,
  contrato_id,
  titulo,
  descripcion,
  estado,
  prioridad,
  categoria,
  fecha_creacion
)
VALUES
  (
    22,
    6,
    34,
    'Pérdida de agua en baño principal',
    'Reclamo demo — goteo constante en la llave del lavabo del baño principal (Federico Gonzalez).',
    'Pendiente'::public.reclamo_estado,
    'Urgente'::public.reclamo_prioridad,
    'Plomeria'::public.reclamo_categoria,
    now() - interval '1 day'
  ),
  (
    15,
    1,
    30,
    'Sin luz en dormitorio',
    'Reclamo demo — no funciona la iluminación del dormitorio; resto de la unidad operativa (Carlos Gomez).',
    'En Proceso'::public.reclamo_estado,
    'Media'::public.reclamo_prioridad,
    'Electricidad'::public.reclamo_categoria,
    now() - interval '4 days'
  );

COMMIT;
