-- Corregir calles con altura pegada y eliminar duplicados resultantes.

BEGIN;

DROP INDEX IF EXISTS public.propiedades_ubicacion_key;

UPDATE public.propiedades
SET calle = trim(regexp_replace(trim(calle), '\s+\d+[a-zA-Z]?\s*$', '', 'g'))
WHERE calle ~ '\s+\d+[a-zA-Z]?\s*$';

UPDATE public.propiedades
SET calle_norm = trim(
  regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                lower(translate(trim(calle), 'ÁÉÍÓÚÑáéíóúñ', 'AEIOUNaeioun')),
                '\s+\d+[a-zA-Z]?\s*$',
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

UPDATE public.propiedades
SET direccion = trim(both from concat_ws(
  ', ',
  nullif(trim(concat_ws(' ', calle, altura)), ''),
  CASE WHEN coalesce(trim(piso), '') <> '' THEN
    CASE WHEN upper(trim(piso)) IN ('PB', '0', 'PLANTA BAJA') THEN 'PB'
    ELSE 'Piso ' || trim(piso) END
  END,
  CASE WHEN coalesce(trim(unidad), '') <> '' THEN
    CASE WHEN lower(trim(unidad)) ~ '^(depto|local|unidad)\b' THEN trim(unidad)
    WHEN lower(trim(unidad)) ~ '^local\b' THEN trim(unidad)
    ELSE 'Depto ' || trim(unidad) END
  END,
  nullif(trim(ciudad), '')
));

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
