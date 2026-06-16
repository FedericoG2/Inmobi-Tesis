-- Recalcular calle_norm con reglas unificadas y eliminar duplicados de ubicación.

BEGIN;

DROP INDEX IF EXISTS public.propiedades_ubicacion_key;

UPDATE public.propiedades
SET calle_norm = trim(
  regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              lower(translate(trim(calle), 'ÁÉÍÓÚÑáéíóúñ', 'AEIOUNaeioun')),
              '\s+',
              ' ',
              'g'
            ),
            'avenida',
            'av',
            'gi'
          ),
          'boulevard',
          'bv',
          'gi'
        ),
        'blvd\.?\s*',
        'bv ',
        'gi'
      ),
      'calle',
      'c',
      'gi'
    ),
    '(av|bv|c)\.?\s+',
    '\1 ',
    'gi'
  )
);

UPDATE public.propiedades
SET
  piso_norm = COALESCE(piso_norm, ''),
  unidad_norm = COALESCE(unidad_norm, ''),
  ciudad_norm = CASE ciudad
    WHEN 'Córdoba' THEN 'cordoba'
    WHEN 'Villa María' THEN 'villa maria'
    WHEN 'Río Cuarto' THEN 'rio cuarto'
    ELSE COALESCE(ciudad_norm, lower(trim(ciudad)))
  END;

DELETE FROM public.propiedades
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY calle_norm, altura_norm, piso_norm, unidad_norm, ciudad_norm
        ORDER BY id
      ) AS rn
    FROM public.propiedades
  ) duplicados
  WHERE rn > 1
);

CREATE UNIQUE INDEX propiedades_ubicacion_key
  ON public.propiedades (calle_norm, altura_norm, piso_norm, unidad_norm, ciudad_norm);

COMMIT;
