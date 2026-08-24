-- Snapshot de confirmación sin leer public.indices.
-- El cálculo vive en el cliente (Argly o carga manual); Postgres solo persiste.

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
  v_fecha_desde date;
  v_fecha_siguiente date;
  v_monto_nuevo numeric;
  v_modo text;
  v_indice_tipo public.indice_referencia;
  v_detalle jsonb;
  v_es_programado boolean;
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

      IF v_contrato.estado IS DISTINCT FROM 'activo'::public.contrato_estado THEN
        v_errors := v_errors || jsonb_build_object('contrato_id', v_contrato.id, 'error', 'El contrato no esta activo');
        CONTINUE;
      END IF;

      v_fecha_aplicacion := v_contrato.fecha_proximo_aumento;

      IF v_fecha_aplicacion IS NULL THEN
        v_errors := v_errors || jsonb_build_object('contrato_id', v_contrato.id, 'error', 'Sin fecha de proximo aumento');
        CONTINUE;
      END IF;

      IF v_fecha_aplicacion > v_contrato.fecha_fin THEN
        v_errors := v_errors || jsonb_build_object(
          'contrato_id', v_contrato.id,
          'error', 'La fecha del aumento supera el fin del contrato'
        );
        CONTINUE;
      END IF;

      IF EXISTS (
        SELECT 1 FROM public.aumentos a
        WHERE a.contrato_id = v_contrato.id
          AND a.fecha_aplicacion = v_fecha_aplicacion
      ) THEN
        v_errors := v_errors || jsonb_build_object(
          'contrato_id', v_contrato.id,
          'error', 'Ya hay un aumento registrado para esta fecha'
        );
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

      v_es_programado := v_fecha_aplicacion > CURRENT_DATE;
      v_fecha_desde := COALESCE(v_contrato.fecha_ultimo_aumento, v_contrato.fecha_inicio);

      IF item ? 'detalle_calculo' AND jsonb_typeof(item->'detalle_calculo') = 'object' THEN
        v_detalle := item->'detalle_calculo';
      ELSE
        v_detalle := jsonb_build_object(
          'tipo', v_contrato.tipo_ajuste::text,
          'icl_inicio', NULLIF(item->>'indice_valor_inicio', '')::numeric,
          'icl_fin', NULLIF(item->>'indice_valor_fin', '')::numeric
        );
      END IF;

      v_detalle := v_detalle || jsonb_build_object(
        'fecha_desde', COALESCE(v_detalle->>'fecha_desde', v_fecha_desde::text),
        'fecha_hasta', v_fecha_aplicacion,
        'monto_anterior', v_contrato.monto_alquiler,
        'monto_nuevo', v_monto_nuevo,
        'variacion_pct', NULLIF(item->>'porcentaje_aplicado', '')::numeric,
        'modo', v_modo,
        'indice_tipo', v_contrato.tipo_ajuste::text,
        'es_aproximado', false,
        'programado', v_es_programado,
        'fuente', COALESCE(NULLIF(item->>'fuente', ''), NULLIF(v_detalle->>'fuente', ''), 'argly'),
        'confirmado_por', auth.uid(),
        'fecha_confirmacion', now()
      );

      INSERT INTO public.aumentos (
        contrato_id, fecha_aplicacion, monto_anterior, monto_nuevo,
        porcentaje_aplicado, indice_tipo, indice_valor_inicio, indice_valor_fin,
        modo, notas, detalle_calculo, aplicado
      ) VALUES (
        v_contrato.id, v_fecha_aplicacion, v_contrato.monto_alquiler, v_monto_nuevo,
        NULLIF(item->>'porcentaje_aplicado', '')::numeric,
        v_indice_tipo,
        NULLIF(item->>'indice_valor_inicio', '')::numeric,
        NULLIF(item->>'indice_valor_fin', '')::numeric,
        v_modo,
        NULLIF(trim(item->>'notas'), ''),
        v_detalle,
        NOT v_es_programado
      );

      IF NOT v_es_programado THEN
        v_fecha_siguiente := (v_fecha_aplicacion + (v_contrato.periodicidad_meses || ' months')::interval)::date;

        UPDATE public.contratos SET
          monto_alquiler = v_monto_nuevo,
          fecha_ultimo_aumento = v_fecha_aplicacion,
          fecha_proximo_aumento = CASE
            WHEN v_fecha_siguiente > fecha_fin THEN NULL
            ELSE v_fecha_siguiente
          END,
          updated_at = now()
        WHERE id = v_contrato.id;
      END IF;

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
