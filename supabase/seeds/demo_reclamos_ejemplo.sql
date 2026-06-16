-- Dos reclamos de ejemplo para desarrollo y demos.
-- Requiere contratos activos: Federico Gonzalez (6) en propiedad 13, Carlos Gomez (1) en propiedad 15.

BEGIN;

DELETE FROM public.reclamos
WHERE descripcion LIKE 'Reclamo demo —%';

INSERT INTO public.reclamos (
  propiedad_id,
  inquilino_id,
  titulo,
  descripcion,
  estado,
  prioridad,
  categoria,
  fecha_creacion
)
VALUES
  (
    13,
    6,
    'Pérdida de agua en baño principal',
    'Reclamo demo — goteo constante en la llave del lavabo del baño principal.',
    'Pendiente'::public.reclamo_estado,
    'Urgente'::public.reclamo_prioridad,
    'Plomeria'::public.reclamo_categoria,
    now() - interval '2 days'
  ),
  (
    15,
    1,
    'Sin luz en dormitorio',
    'Reclamo demo — no funciona la iluminación del dormitorio; resto de la unidad operativa.',
    'En Proceso'::public.reclamo_estado,
    'Media'::public.reclamo_prioridad,
    'Electricidad'::public.reclamo_categoria,
    now() - interval '5 days'
  );

COMMIT;
