-- Normalizar direcciones de propiedades demo con formato serio (Córdoba).

BEGIN;

UPDATE public.propiedades SET direccion = 'Av. Fabricio E. Carrascull 621, Córdoba' WHERE id = 8;
UPDATE public.propiedades SET direccion = 'Av. Colón 4500, Córdoba' WHERE id = 9;
UPDATE public.propiedades SET direccion = 'Bv. Illia 50, Córdoba' WHERE id = 10;
UPDATE public.propiedades SET direccion = 'Av. Tristán Malbrán 3866, Córdoba' WHERE id = 11;
UPDATE public.propiedades SET direccion = 'Av. Vélez Sársfield 1280, Córdoba' WHERE id = 12;

COMMIT;
