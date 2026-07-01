-- Dos reclamos demo adicionales (idempotente por título + prefijo demo).
-- No elimina reclamos existentes.

BEGIN;

DELETE FROM public.reclamo_eventos
WHERE reclamo_id IN (
  SELECT id FROM public.reclamos
  WHERE descripcion LIKE 'Reclamo demo —%'
    AND titulo IN (
      'Pérdida de agua en baño principal',
      'Puerta del local no cierra bien'
    )
);

DELETE FROM public.reclamos
WHERE descripcion LIKE 'Reclamo demo —%'
  AND titulo IN (
    'Pérdida de agua en baño principal',
    'Puerta del local no cierra bien'
  );

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
    'Reclamo demo — goteo constante en la llave del lavabo del baño principal. El inquilino colocó un balde debajo para evitar daños en el piso.',
    'Pendiente'::public.reclamo_estado,
    'Urgente'::public.reclamo_prioridad,
    'Plomeria'::public.reclamo_categoria,
    now() - interval '18 hours'
  ),
  (
    16,
    20,
    32,
    'Puerta del local no cierra bien',
    'Reclamo demo — la puerta de acceso al local comercial no encastra correctamente y queda entreabierta. Afecta la seguridad del local.',
    'Pendiente'::public.reclamo_estado,
    'Alta'::public.reclamo_prioridad,
    'Cerrajeria'::public.reclamo_categoria,
    now() - interval '2 days'
  );

COMMIT;