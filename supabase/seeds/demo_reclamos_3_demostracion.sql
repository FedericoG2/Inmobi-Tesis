-- Tres reclamos de demostración vinculados a contratos activos.
-- Idempotente por prefijo en descripcion.

BEGIN;

DELETE FROM public.reclamo_eventos
WHERE reclamo_id IN (
  SELECT id FROM public.reclamos WHERE descripcion LIKE 'Reclamo demo —%'
);

DELETE FROM public.reclamos
WHERE descripcion LIKE 'Reclamo demo —%';

WITH nuevos AS (
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
      15,
      1,
      30,
      'Sin luz en dormitorio',
      'Reclamo demo — no funciona la iluminación del dormitorio principal. El resto de la unidad tiene luz normal. Probó cambiar la lámpara sin éxito.',
      'En Proceso'::public.reclamo_estado,
      'Media'::public.reclamo_prioridad,
      'Electricidad'::public.reclamo_categoria,
      now() - interval '5 days'
    ),
    (
      14,
      18,
      31,
      'Olores a gas en cocina del local',
      'Reclamo demo — el inquilino reporta olor a gas intermitente cerca de la cocina del local comercial. Ventilación encendida y válvula principal verificada.',
      'Revision'::public.reclamo_estado,
      'Alta'::public.reclamo_prioridad,
      'Gas'::public.reclamo_categoria,
      now() - interval '3 days'
    )
  RETURNING id, titulo
)
INSERT INTO public.reclamo_eventos (reclamo_id, estado_anterior, estado_nuevo, comentario, fecha_creacion)
SELECT r.id, e.estado_anterior, e.estado_nuevo, e.comentario, e.fecha_creacion
FROM nuevos r
JOIN (
  VALUES
    (
      'Sin luz en dormitorio',
      'Pendiente'::public.reclamo_estado,
      'En Proceso'::public.reclamo_estado,
      'Electricista contactado. Visita agendada para mañana 10:00 hs.',
      now() - interval '2 days'
    ),
    (
      'Olores a gas en cocina del local',
      'Pendiente'::public.reclamo_estado,
      'En Proceso'::public.reclamo_estado,
      'Gasista verificó instalación en sitio. No se detectaron pérdidas visibles.',
      now() - interval '2 days'
    ),
    (
      'Olores a gas en cocina del local',
      'En Proceso'::public.reclamo_estado,
      'Revision'::public.reclamo_estado,
      'Se solicita segunda inspección de la red interna antes de cerrar el reclamo.',
      now() - interval '1 day'
    )
) AS e(titulo, estado_anterior, estado_nuevo, comentario, fecha_creacion)
  ON r.titulo = e.titulo;

COMMIT;
