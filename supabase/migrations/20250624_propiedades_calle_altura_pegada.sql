-- Corregir calles con altura pegada sin espacio (ej. Chacabuco1250) y deduplicar.

BEGIN;

DROP INDEX IF EXISTS public.propiedades_ubicacion_key;

UPDATE public.propiedades
SET calle = trim(
  regexp_replace(
    regexp_replace(trim(calle), '\s+\d{2,}[a-zA-Z]?\s*$', '', 'g'),
    '([[:alpha:]])[0-9]{2,}[a-zA-Z]?$',
    '\1',
    'g'
  )
)
WHERE calle ~ '\s+\d{2,}[a-zA-Z]?\s*$'
   OR calle ~ '[[:alpha:]][0-9]{2,}[a-zA-Z]?$';

UPDATE public.propiedades
SET calle_norm = trim(
  regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  lower(translate(trim(calle), 'ÁÉÍÓÚÑáéíóúñ', 'AEIOUNaeioun')),
                  '([[:alpha:]])[0-9]{2,}[a-zA-Z]?$',
                  '\1',
                  'g'
                ),
                '\s+\d{2,}[a-zA-Z]?\s*$',
                '',
                'g'
              ),
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
