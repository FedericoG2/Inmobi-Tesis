-- Normalizar *_norm vacíos y eliminar propiedades duplicadas por ubicación (conserva el id menor).

BEGIN;

UPDATE public.propiedades
SET
  piso_norm = COALESCE(piso_norm, ''),
  unidad_norm = COALESCE(unidad_norm, ''),
  ciudad_norm = CASE ciudad
    WHEN 'Córdoba' THEN 'cordoba'
    WHEN 'Villa María' THEN 'villa maria'
    WHEN 'Río Cuarto' THEN 'rio cuarto'
    ELSE COALESCE(ciudad_norm, lower(trim(ciudad)))
  END
WHERE piso_norm IS NULL
   OR unidad_norm IS NULL
   OR ciudad_norm IS NULL;

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

COMMIT;
