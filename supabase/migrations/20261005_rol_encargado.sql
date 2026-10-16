-- Roles según el alcance: admin = Administrador de sistema, encargado = Encargado de Alquileres, inquilino.
-- ADD VALUE no puede usarse en la misma transacción que lo consume: va en una migración aparte.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'encargado';
