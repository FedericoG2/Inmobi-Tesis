-- Rol Propietario (alcance 1.3.4): consulta sus propiedades, contratos, alquileres y documentos.
-- ADD VALUE no puede usarse en la misma transacción que lo consume: va en una migración aparte.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'propietario';
