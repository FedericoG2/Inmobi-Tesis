-- Elimina módulos de garantes y configuración de inmobiliaria (fuera de alcance actual).

DROP TABLE IF EXISTS public.contrato_garantes;
DROP TRIGGER IF EXISTS trg_bloquear_delete_garante_con_contrato_vigente ON public.garantes;
DROP FUNCTION IF EXISTS public.bloquear_delete_garante_con_contrato_vigente();
DROP TABLE IF EXISTS public.garantes;
DROP TABLE IF EXISTS public.config_inmobiliaria;
