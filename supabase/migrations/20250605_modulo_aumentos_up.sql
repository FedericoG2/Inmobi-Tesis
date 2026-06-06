-- =============================================================================
-- INMOBI — Módulo aumentos (UP) — Paso 1
-- Tablas: indices, aumentos | RPC: confirmar_aumentos
-- =============================================================================

BEGIN;

CREATE TYPE public.indice_referencia AS ENUM ('icl', 'ipc');

CREATE TABLE public.indices (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  indice public.indice_referencia NOT NULL,
  fecha date NULL,
  anio smallint NULL,
  mes smallint NULL,
  valor numeric NOT NULL CHECK (valor > 0),
  fuente text NOT NULL DEFAULT 'argly',
  fecha_sync timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT indices_periodo_check CHECK (
    (fecha IS NOT NULL AND anio IS NULL AND mes IS NULL)
    OR (
      fecha IS NULL
      AND anio IS NOT NULL
      AND mes IS NOT NULL
      AND mes BETWEEN 1 AND 12
    )
  )
);

CREATE UNIQUE INDEX indices_icl_fecha_unique
  ON public.indices (indice, fecha)
  WHERE fecha IS NOT NULL;

CREATE UNIQUE INDEX indices_ipc_mes_unique
  ON public.indices (indice, anio, mes)
  WHERE anio IS NOT NULL;

CREATE INDEX indices_icl_fecha_lookup
  ON public.indices (indice, fecha DESC)
  WHERE indice = 'icl';

CREATE INDEX indices_ipc_mes_lookup
  ON public.indices (indice, anio DESC, mes DESC)
  WHERE indice = 'ipc';

CREATE TABLE public.aumentos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contrato_id bigint NOT NULL REFERENCES public.contratos (id) ON DELETE RESTRICT,
  fecha_aplicacion date NOT NULL,
  monto_anterior numeric NOT NULL CHECK (monto_anterior >= 0),
  monto_nuevo numeric NOT NULL CHECK (monto_nuevo >= 0),
  porcentaje_aplicado numeric NULL,
  indice_tipo public.indice_referencia NULL,
  indice_valor_inicio numeric NULL,
  indice_valor_fin numeric NULL,
  modo text NOT NULL CHECK (modo IN ('calculado', 'manual', 'porcentaje_fijo')),
  notas text NULL,
  fecha_creacion timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_aumentos_contrato_id ON public.aumentos (contrato_id);
CREATE INDEX idx_aumentos_fecha_aplicacion ON public.aumentos (fecha_aplicacion DESC);

ALTER TABLE public.indices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aumentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin CRUD indices"
  ON public.indices FOR ALL TO authenticated
  USING (public.es_admin())
  WITH CHECK (public.es_admin());

CREATE POLICY "Admin CRUD total / Inquilino ve aumentos de su contrato activo"
  ON public.aumentos FOR ALL TO authenticated
  USING (
    public.es_admin()
    OR contrato_id IN (
      SELECT c.id FROM public.contratos c
      WHERE c.inquilino_id = public.obtener_inquilino_id() AND c.activo = true
    )
  )
  WITH CHECK (public.es_admin());

CREATE OR REPLACE FUNCTION public.confirmar_aumentos(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  v_contrato public.contratos%ROWTYPE;
  v_fecha_aplicacion date;
  v_monto_nuevo numeric;
  v_modo text;
  v_indice_tipo public.indice_referencia;
  v_count int := 0;
  v_errors jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.es_admin() THEN
    RAISE EXCEPTION 'Solo administradores pueden confirmar aumentos' USING ERRCODE = 'P0001';
  END IF;

  IF payload IS NULL OR jsonb_typeof(payload) <> 'array' THEN
    RAISE EXCEPTION 'Payload invalido: se espera un array JSON' USING ERRCODE = 'P0001';
  END IF;

  FOR item IN SELECT t.value FROM jsonb_array_elements(payload) AS t(value)
  LOOP
    BEGIN
      SELECT * INTO v_contrato FROM public.contratos
      WHERE id = (item->>'contrato_id')::bigint FOR UPDATE;

      IF NOT FOUND THEN
        v_errors := v_errors || jsonb_build_object('contrato_id', item->>'contrato_id', 'error', 'Contrato no encontrado');
        CONTINUE;
      END IF;

      IF NOT v_contrato.activo THEN
        v_errors := v_errors || jsonb_build_object('contrato_id', v_contrato.id, 'error', 'El contrato no esta activo');
        CONTINUE;
      END IF;

      v_fecha_aplicacion := v_contrato.fecha_proximo_aumento;

      IF v_fecha_aplicacion IS NULL THEN
        v_errors := v_errors || jsonb_build_object('contrato_id', v_contrato.id, 'error', 'Sin fecha de proximo aumento');
        CONTINUE;
      END IF;

      IF v_fecha_aplicacion > CURRENT_DATE THEN
        v_errors := v_errors || jsonb_build_object('contrato_id', v_contrato.id, 'error', 'Aumento futuro: solo preview');
        CONTINUE;
      END IF;

      v_monto_nuevo := (item->>'monto_nuevo')::numeric;
      IF v_monto_nuevo IS NULL OR v_monto_nuevo < 0 THEN
        v_errors := v_errors || jsonb_build_object('contrato_id', v_contrato.id, 'error', 'Monto nuevo invalido');
        CONTINUE;
      END IF;

      v_modo := item->>'modo';
      IF v_modo IS NULL OR v_modo NOT IN ('calculado', 'manual', 'porcentaje_fijo') THEN
        v_errors := v_errors || jsonb_build_object('contrato_id', v_contrato.id, 'error', 'Modo invalido');
        CONTINUE;
      END IF;

      v_indice_tipo := NULL;
      IF COALESCE(item->>'indice_tipo', '') <> '' THEN
        v_indice_tipo := (item->>'indice_tipo')::public.indice_referencia;
      END IF;

      INSERT INTO public.aumentos (
        contrato_id, fecha_aplicacion, monto_anterior, monto_nuevo,
        porcentaje_aplicado, indice_tipo, indice_valor_inicio, indice_valor_fin, modo, notas
      ) VALUES (
        v_contrato.id, v_fecha_aplicacion, v_contrato.monto_alquiler, v_monto_nuevo,
        NULLIF(item->>'porcentaje_aplicado', '')::numeric,
        v_indice_tipo,
        NULLIF(item->>'indice_valor_inicio', '')::numeric,
        NULLIF(item->>'indice_valor_fin', '')::numeric,
        v_modo,
        NULLIF(trim(item->>'notas'), '')
      );

      UPDATE public.contratos SET
        monto_alquiler = v_monto_nuevo,
        fecha_ultimo_aumento = v_fecha_aplicacion,
        fecha_proximo_aumento = (v_fecha_aplicacion + (periodicidad_meses || ' months')::interval)::date,
        updated_at = now()
      WHERE id = v_contrato.id;

      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_object('contrato_id', item->>'contrato_id', 'error', SQLERRM);
    END;
  END LOOP;

  RETURN jsonb_build_object('confirmados', v_count, 'errores', v_errors);
END;
$$;

REVOKE ALL ON FUNCTION public.confirmar_aumentos(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirmar_aumentos(jsonb) TO authenticated;

COMMIT;
