-- =============================================================================
-- INMOBI — Datos de demo para la presentación
--
-- Carga una cartera chica y coherente (Córdoba) con fechas RELATIVAS al día en
-- que se ejecuta, así la demo muestra siempre el mismo escenario:
--
--   Propietarios  5  (particulares y empresas)
--   Propiedades  11  (alquiladas, una reservada, dos disponibles, una en mantenimiento)
--   Inquilinos    9
--   Contratos     9
--     · 3 con aumento PENDIENTE en el período operativo (IPC e ICL)
--     · 1 REZAGADO (aumento del mes pasado sin confirmar)
--     · 1 al día (aumento del mes pasado ya aplicado)
--     · 1 POR VENCER en ~45 días
--     · 1 PROGRAMADO (arranca el mes que viene → propiedad Reservada)
--     · 1 con aumento ACORDADO a futuro
--     · 1 FINALIZADO (histórico; la propiedad volvió a Disponible)
--   Aumentos      historial aplicado + uno acordado
--   Reclamos      7 en todos los estados (Pendiente, En Proceso, Revisión, Resuelto)
--                 con su historial de gestión
--   Actividad     se reconstruye al final con fechas reales
--
-- Requisitos: migraciones al día (incluida 20261008_actividad_sistema.sql).
-- Opcional: ejecutar antes demo_00_limpiar.sql para que solo quede la demo.
-- Se puede volver a ejecutar: primero borra los datos de demo de una corrida anterior.
--
-- Portal del inquilino: crear en Supabase → Authentication → Users el usuario
--   inquilino.demo@inmobi.com  (con la contraseña que quieran)
-- ANTES de ejecutar este script: al final se vincula con Mariana López.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  -- Personas de la demo (claves naturales: CUIT)
  c_propietarios text[] := ARRAY['27160987456','30717894561','20187654329','30709876542','27215554443'];
  c_inquilinos   text[] := ARRAY['27351234569','20289876543','30712345678','27384561237','20331234568',
                                 '27401239876','27428765431','20301122334','20395551238'];
  c_email_portal text := 'inquilino.demo@inmobi.com';

  d_hoy date := current_date;
  -- Período operativo: hasta el día 10 es el mes en curso; después, el mes siguiente.
  d_p date := (CASE WHEN extract(day FROM current_date) <= 10
                    THEN date_trunc('month', current_date)
                    ELSE date_trunc('month', current_date) + interval '1 month' END)::date;

  -- ids
  pr_molina bigint; pr_alberdi bigint; pr_paz bigint; pr_sur bigint; pr_quiroga bigint;
  i_mariana bigint; i_carlos bigint; i_estudio bigint; i_lucia bigint; i_diego bigint;
  i_natalia bigint; i_valentina bigint; i_javier bigint; i_agustin bigint;
  p1 bigint; p2 bigint; p3 bigint; p4 bigint; p5 bigint; p6 bigint; p7 bigint; p8 bigint;
  p9 bigint; p10 bigint; p11 bigint;
  c1 bigint; c2 bigint; c3 bigint; c4 bigint; c5 bigint; c6 bigint; c7 bigint; c8 bigint; c9 bigint;
  r bigint;
  v_inicio date; v_fin date;
  v_user uuid;
BEGIN
  -- ---------------------------------------------------------------------------
  -- 0) Borrar la demo de una corrida anterior (solo las personas de la demo)
  -- ---------------------------------------------------------------------------
  DELETE FROM public.documentos d
  USING public.contratos c, public.inquilinos i
  WHERE d.contrato_id = c.id AND c.inquilino_id = i.id AND i.dni_cuit = ANY (c_inquilinos);

  DELETE FROM public.reclamos r0
  USING public.inquilinos i
  WHERE r0.inquilino_id = i.id AND i.dni_cuit = ANY (c_inquilinos);

  DELETE FROM public.aumentos a
  USING public.contratos c, public.inquilinos i
  WHERE a.contrato_id = c.id AND c.inquilino_id = i.id AND i.dni_cuit = ANY (c_inquilinos);

  UPDATE public.contratos c
  SET estado = 'inactivo'::public.contrato_estado, activo = false
  FROM public.inquilinos i
  WHERE c.inquilino_id = i.id AND i.dni_cuit = ANY (c_inquilinos)
    AND c.estado <> 'inactivo'::public.contrato_estado;

  DELETE FROM public.contratos c
  USING public.inquilinos i
  WHERE c.inquilino_id = i.id AND i.dni_cuit = ANY (c_inquilinos);

  -- Propiedades de los propietarios de la demo (sin contratos ajenos activos).
  DELETE FROM public.propiedades p
  USING public.propietarios o
  WHERE p.propietario_id = o.id AND o.dni_cuit = ANY (c_propietarios)
    AND NOT EXISTS (
      SELECT 1 FROM public.contratos c
      WHERE c.propiedad_id = p.id AND c.estado <> 'inactivo'::public.contrato_estado
    );

  UPDATE public.inquilinos SET perfil_id = NULL WHERE dni_cuit = ANY (c_inquilinos);
  DELETE FROM public.inquilinos WHERE dni_cuit = ANY (c_inquilinos);
  DELETE FROM public.propietarios o
  WHERE o.dni_cuit = ANY (c_propietarios)
    AND NOT EXISTS (SELECT 1 FROM public.propiedades p WHERE p.propietario_id = o.id);

  -- ---------------------------------------------------------------------------
  -- 1) Propietarios
  -- ---------------------------------------------------------------------------
  INSERT INTO public.propietarios (nombre_completo, dni_cuit, tipo_persona, telefono, email, domicilio)
  VALUES ('Silvia Beatriz Molina', '27160987456', 'Física', '3514872210', 'silvia.molina@correo.com', 'Av. Colón 1650, Córdoba')
  ON CONFLICT (dni_cuit) DO UPDATE SET nombre_completo = EXCLUDED.nombre_completo
  RETURNING id INTO pr_molina;

  INSERT INTO public.propietarios (nombre_completo, dni_cuit, tipo_persona, telefono, email, domicilio)
  VALUES ('Grupo Alberdi S.A.', '30717894561', 'Jurídica', '3514229088', 'administracion@grupoalberdi.com', 'Bv. San Juan 450, Córdoba')
  ON CONFLICT (dni_cuit) DO UPDATE SET nombre_completo = EXCLUDED.nombre_completo
  RETURNING id INTO pr_alberdi;

  INSERT INTO public.propietarios (nombre_completo, dni_cuit, tipo_persona, telefono, email, domicilio)
  VALUES ('Roberto Daniel Paz', '20187654329', 'Física', '3515561020', 'roberto.paz@correo.com', 'Duarte Quirós 1120, Córdoba')
  ON CONFLICT (dni_cuit) DO UPDATE SET nombre_completo = EXCLUDED.nombre_completo
  RETURNING id INTO pr_paz;

  INSERT INTO public.propietarios (nombre_completo, dni_cuit, tipo_persona, telefono, email, domicilio)
  VALUES ('Inversiones del Sur S.A.', '30709876542', 'Jurídica', '3514118800', 'contacto@inversionesdelsur.com', 'Av. Hipólito Yrigoyen 380, Córdoba')
  ON CONFLICT (dni_cuit) DO UPDATE SET nombre_completo = EXCLUDED.nombre_completo
  RETURNING id INTO pr_sur;

  INSERT INTO public.propietarios (nombre_completo, dni_cuit, tipo_persona, telefono, email, domicilio)
  VALUES ('Marta Elena Quiroga', '27215554443', 'Física', '3516093344', 'marta.quiroga@correo.com', 'Lima 255, Córdoba')
  ON CONFLICT (dni_cuit) DO UPDATE SET nombre_completo = EXCLUDED.nombre_completo
  RETURNING id INTO pr_quiroga;

  -- ---------------------------------------------------------------------------
  -- 2) Inquilinos
  -- ---------------------------------------------------------------------------
  INSERT INTO public.inquilinos (nombre_completo, dni_cuit, tipo_persona, telefono, email, ocupacion, estado_civil, fecha_nacimiento, emergencia_nombre, emergencia_telefono)
  VALUES ('Mariana Belén López', '27351234569', 'Física', '3516114477', c_email_portal, 'Diseñadora gráfica', 'Soltero/a', '1991-04-12', 'Graciela López (madre)', '3514770011')
  RETURNING id INTO i_mariana;

  INSERT INTO public.inquilinos (nombre_completo, dni_cuit, tipo_persona, telefono, email, ocupacion, estado_civil, fecha_nacimiento)
  VALUES ('Carlos Alberto Gómez', '20289876543', 'Física', '3515402233', 'carlos.gomez@correo.com', 'Docente', 'Casado/a', '1982-09-03')
  RETURNING id INTO i_carlos;

  INSERT INTO public.inquilinos (nombre_completo, dni_cuit, tipo_persona, telefono, email, ocupacion)
  VALUES ('Estudio Contable Rivadavia S.R.L.', '30712345678', 'Jurídica', '3514256677', 'estudio@rivadaviacontable.com', 'Servicios contables')
  RETURNING id INTO i_estudio;

  INSERT INTO public.inquilinos (nombre_completo, dni_cuit, tipo_persona, telefono, email, ocupacion, estado_civil, fecha_nacimiento)
  VALUES ('Lucía Fernández', '27384561237', 'Física', '3516559012', 'lucia.fernandez@correo.com', 'Enfermera', 'Soltero/a', '1994-01-28')
  RETURNING id INTO i_lucia;

  INSERT INTO public.inquilinos (nombre_completo, dni_cuit, tipo_persona, telefono, email, ocupacion, estado_civil, fecha_nacimiento)
  VALUES ('Diego Matías Herrera', '20331234568', 'Física', '3517028899', 'diego.herrera@correo.com', 'Desarrollador de software', 'Casado/a', '1988-06-15')
  RETURNING id INTO i_diego;

  INSERT INTO public.inquilinos (nombre_completo, dni_cuit, tipo_persona, telefono, email, ocupacion, estado_civil, fecha_nacimiento)
  VALUES ('Natalia Soledad Ruiz', '27401239876', 'Física', '3516114470', 'natalia.ruiz@correo.com', 'Arquitecta', 'Soltero/a', '1996-11-02')
  RETURNING id INTO i_natalia;

  INSERT INTO public.inquilinos (nombre_completo, dni_cuit, tipo_persona, telefono, email, ocupacion, estado_civil, fecha_nacimiento)
  VALUES ('Valentina Sosa', '27428765431', 'Física', '3513307788', 'valentina.sosa@correo.com', 'Abogada', 'Soltero/a', '1998-03-21')
  RETURNING id INTO i_valentina;

  INSERT INTO public.inquilinos (nombre_completo, dni_cuit, tipo_persona, telefono, email, ocupacion, estado_civil, fecha_nacimiento)
  VALUES ('Javier Méndez', '20301122334', 'Física', '3515904411', 'javier.mendez@correo.com', 'Comerciante', 'Divorciado/a', '1979-08-09')
  RETURNING id INTO i_javier;

  INSERT INTO public.inquilinos (nombre_completo, dni_cuit, tipo_persona, telefono, email, ocupacion, estado_civil, fecha_nacimiento)
  VALUES ('Agustín Torres', '20395551238', 'Física', '3516220099', 'agustin.torres@correo.com', 'Contador', 'Casado/a', '1990-12-07')
  RETURNING id INTO i_agustin;

  -- ---------------------------------------------------------------------------
  -- 3) Propiedades (claves normalizadas como las arma la app)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.propiedades (propietario_id, calle, altura, piso, unidad, ciudad,
    calle_norm, altura_norm, piso_norm, unidad_norm, ciudad_norm, direccion, tipo, estado)
  VALUES (pr_molina, 'Achával Rodríguez', '1480', '3', 'B', 'Córdoba',
    'achaval rodriguez', '1480', '3', 'B', 'cordoba', 'Achával Rodríguez 1480, Piso 3, Depto B, Córdoba', 'Departamento', 'Disponible')
  RETURNING id INTO p1;

  INSERT INTO public.propiedades (propietario_id, calle, altura, piso, unidad, ciudad,
    calle_norm, altura_norm, piso_norm, unidad_norm, ciudad_norm, direccion, tipo, estado)
  VALUES (pr_paz, 'Obispo Trejo', '900', '1', 'A', 'Córdoba',
    'obispo trejo', '900', '1', 'A', 'cordoba', 'Obispo Trejo 900, Piso 1, Depto A, Córdoba', 'Departamento', 'Disponible')
  RETURNING id INTO p2;

  INSERT INTO public.propiedades (propietario_id, calle, altura, piso, unidad, ciudad,
    calle_norm, altura_norm, piso_norm, unidad_norm, ciudad_norm, direccion, tipo, estado)
  VALUES (pr_alberdi, 'Av. Vélez Sársfield', '2150', 'PB', 'Local 2', 'Córdoba',
    'av velez sarsfield', '2150', '', 'LOCAL 2', 'cordoba', 'Av. Vélez Sársfield 2150, PB, Local 2, Córdoba', 'Local comercial', 'Disponible')
  RETURNING id INTO p3;

  INSERT INTO public.propiedades (propietario_id, calle, altura, piso, unidad, ciudad,
    calle_norm, altura_norm, piso_norm, unidad_norm, ciudad_norm, direccion, tipo, estado)
  VALUES (pr_quiroga, 'Mariano Fragueiro', '2345', '', '', 'Córdoba',
    'mariano fragueiro', '2345', '', '', 'cordoba', 'Mariano Fragueiro 2345, Córdoba', 'Casa', 'Disponible')
  RETURNING id INTO p4;

  INSERT INTO public.propiedades (propietario_id, calle, altura, piso, unidad, ciudad,
    calle_norm, altura_norm, piso_norm, unidad_norm, ciudad_norm, direccion, tipo, estado)
  VALUES (pr_sur, 'Bv. Chacabuco', '450', '5', 'C', 'Córdoba',
    'bv chacabuco', '450', '5', 'C', 'cordoba', 'Bv. Chacabuco 450, Piso 5, Depto C, Córdoba', 'Departamento', 'Disponible')
  RETURNING id INTO p5;

  INSERT INTO public.propiedades (propietario_id, calle, altura, piso, unidad, ciudad,
    calle_norm, altura_norm, piso_norm, unidad_norm, ciudad_norm, direccion, tipo, estado)
  VALUES (pr_molina, 'Rondeau', '1250', '2', 'D', 'Córdoba',
    'rondeau', '1250', '2', 'D', 'cordoba', 'Rondeau 1250, Piso 2, Depto D, Córdoba', 'Departamento', 'Disponible')
  RETURNING id INTO p6;

  INSERT INTO public.propiedades (propietario_id, calle, altura, piso, unidad, ciudad,
    calle_norm, altura_norm, piso_norm, unidad_norm, ciudad_norm, direccion, tipo, estado)
  VALUES (pr_paz, 'Av. Fader', '3870', '', '', 'Córdoba',
    'av fader', '3870', '', '', 'cordoba', 'Av. Fader 3870, Córdoba', 'Casa', 'Disponible')
  RETURNING id INTO p7;

  INSERT INTO public.propiedades (propietario_id, calle, altura, piso, unidad, ciudad,
    calle_norm, altura_norm, piso_norm, unidad_norm, ciudad_norm, direccion, tipo, estado)
  VALUES (pr_alberdi, '9 de Julio', '640', 'PB', 'Local 1', 'Córdoba',
    '9 de julio', '640', '', 'LOCAL 1', 'cordoba', '9 de Julio 640, PB, Local 1, Córdoba', 'Local comercial', 'Disponible')
  RETURNING id INTO p8;

  INSERT INTO public.propiedades (propietario_id, calle, altura, piso, unidad, ciudad,
    calle_norm, altura_norm, piso_norm, unidad_norm, ciudad_norm, direccion, tipo, estado)
  VALUES (pr_sur, 'Av. Patria', '820', '4', 'A', 'Córdoba',
    'av patria', '820', '4', 'A', 'cordoba', 'Av. Patria 820, Piso 4, Depto A, Córdoba', 'Departamento', 'Disponible')
  RETURNING id INTO p9;

  INSERT INTO public.propiedades (propietario_id, calle, altura, piso, unidad, ciudad,
    calle_norm, altura_norm, piso_norm, unidad_norm, ciudad_norm, direccion, tipo, estado)
  VALUES (pr_quiroga, 'Independencia', '1020', '6', 'B', 'Córdoba',
    'independencia', '1020', '6', 'B', 'cordoba', 'Independencia 1020, Piso 6, Depto B, Córdoba', 'Departamento', 'Disponible')
  RETURNING id INTO p10;

  INSERT INTO public.propiedades (propietario_id, calle, altura, piso, unidad, ciudad,
    calle_norm, altura_norm, piso_norm, unidad_norm, ciudad_norm, direccion, tipo, estado)
  VALUES (pr_paz, 'Caseros', '2970', '', '', 'Córdoba',
    'caseros', '2970', '', '', 'cordoba', 'Caseros 2970, Córdoba', 'Casa', 'Mantenimiento')
  RETURNING id INTO p11;

  -- ---------------------------------------------------------------------------
  -- 4) Contratos (el trigger de la base asigna activo/programado y sincroniza la propiedad)
  -- ---------------------------------------------------------------------------

  -- C1 · Mariana López · IPC trimestral · ya tuvo un aumento · PENDIENTE en el período
  v_inicio := (d_p - interval '6 months')::date;
  INSERT INTO public.contratos (propiedad_id, inquilino_id, fecha_inicio, fecha_fin, monto_alquiler, monto_inicial,
    periodicidad_meses, tipo_ajuste, fecha_ultimo_aumento, fecha_proximo_aumento, dia_vencimiento, observaciones)
  VALUES (p1, i_mariana, v_inicio, (v_inicio + interval '2 years' - interval '1 day')::date, 327600, 300000,
    3, 'ipc', (d_p - interval '3 months')::date, d_p, 10, 'Demo · IPC trimestral con aumento pendiente del período')
  RETURNING id INTO c1;

  -- C2 · Carlos Gómez · ICL anual · primer aumento PENDIENTE en el período
  v_inicio := (d_p - interval '12 months')::date;
  INSERT INTO public.contratos (propiedad_id, inquilino_id, fecha_inicio, fecha_fin, monto_alquiler, monto_inicial,
    periodicidad_meses, tipo_ajuste, fecha_proximo_aumento, dia_vencimiento, observaciones)
  VALUES (p2, i_carlos, v_inicio, (v_inicio + interval '3 years' - interval '1 day')::date, 420000, 420000,
    12, 'icl', d_p, 5, 'Demo · ICL anual, primer aumento del contrato')
  RETURNING id INTO c2;

  -- C3 · Estudio Contable · ICL semestral · local comercial · PENDIENTE en el período
  INSERT INTO public.contratos (propiedad_id, inquilino_id, fecha_inicio, fecha_fin, monto_alquiler, monto_inicial,
    periodicidad_meses, tipo_ajuste, fecha_ultimo_aumento, fecha_proximo_aumento, dia_vencimiento, observaciones)
  VALUES (p3, i_estudio, v_inicio, (v_inicio + interval '3 years' - interval '1 day')::date, 719550, 650000,
    6, 'icl', (d_p - interval '6 months')::date, d_p, 5, 'Demo · Local comercial, ICL semestral')
  RETURNING id INTO c3;

  -- C4 · Lucía Fernández · IPC cuatrimestral · aumento del mes pasado sin confirmar (REZAGADO)
  v_inicio := (d_p - interval '5 months')::date;
  INSERT INTO public.contratos (propiedad_id, inquilino_id, fecha_inicio, fecha_fin, monto_alquiler, monto_inicial,
    periodicidad_meses, tipo_ajuste, fecha_proximo_aumento, dia_vencimiento, observaciones)
  VALUES (p4, i_lucia, v_inicio, (v_inicio + interval '2 years' - interval '1 day')::date, 290000, 290000,
    4, 'ipc', (d_p - interval '1 month')::date, 10, 'Demo · Aumento rezagado del mes pasado')
  RETURNING id INTO c4;

  -- C5 · Diego Herrera · IPC trimestral · aumento del mes pasado YA APLICADO (al día)
  v_inicio := (d_p - interval '4 months')::date;
  INSERT INTO public.contratos (propiedad_id, inquilino_id, fecha_inicio, fecha_fin, monto_alquiler, monto_inicial,
    periodicidad_meses, tipo_ajuste, fecha_ultimo_aumento, fecha_proximo_aumento, dia_vencimiento, observaciones)
  VALUES (p5, i_diego, v_inicio, (v_inicio + interval '2 years' - interval '1 day')::date, 301000, 280000,
    3, 'ipc', (d_p - interval '1 month')::date, (d_p + interval '2 months')::date, 10, 'Demo · Contrato al día')
  RETURNING id INTO c5;

  -- C6 · Natalia Ruiz · ICL anual · VENCE en ~45 días (sin más aumentos dentro del plazo → próximo NULL)
  v_fin := d_hoy + 45;
  v_inicio := (v_fin - interval '2 years' + interval '1 day')::date;
  INSERT INTO public.contratos (propiedad_id, inquilino_id, fecha_inicio, fecha_fin, monto_alquiler, monto_inicial,
    periodicidad_meses, tipo_ajuste, fecha_ultimo_aumento, fecha_proximo_aumento, dia_vencimiento, observaciones)
  VALUES (p6, i_natalia, v_inicio, v_fin, 298500, 250000,
    12, 'icl', (v_inicio + interval '1 year')::date, NULL, 5,
    'Demo · Contrato próximo a vencer: coordinar renovación')
  RETURNING id INTO c6;

  -- C7 · Valentina Sosa · arranca el mes que viene → PROGRAMADO (propiedad Reservada)
  v_inicio := (date_trunc('month', d_hoy) + interval '1 month')::date;
  INSERT INTO public.contratos (propiedad_id, inquilino_id, fecha_inicio, fecha_fin, monto_alquiler, monto_inicial,
    periodicidad_meses, tipo_ajuste, fecha_proximo_aumento, dia_vencimiento, observaciones)
  VALUES (p7, i_valentina, v_inicio, (v_inicio + interval '2 years' - interval '1 day')::date, 360000, 360000,
    6, 'ipc', (v_inicio + interval '6 months')::date, 10, 'Demo · Contrato firmado que arranca el mes próximo')
  RETURNING id INTO c7;

  -- C8 · Javier Méndez · contrato TERMINADO hace dos meses (histórico)
  v_fin := d_hoy - 60;
  v_inicio := (v_fin - interval '2 years' + interval '1 day')::date;
  INSERT INTO public.contratos (propiedad_id, inquilino_id, fecha_inicio, fecha_fin, monto_alquiler, monto_inicial,
    periodicidad_meses, tipo_ajuste, fecha_proximo_aumento, dia_vencimiento, observaciones)
  VALUES (p8, i_javier, v_inicio, v_fin, 210000, 180000,
    12, 'icl', NULL, 5, 'Demo · Contrato finalizado (histórico)')
  RETURNING id INTO c8;
  UPDATE public.contratos SET estado = 'inactivo', activo = false WHERE id = c8;

  -- C9 · Agustín Torres · IPC trimestral · próximo aumento ya ACORDADO por adelantado
  v_inicio := (d_p - interval '2 months')::date;
  INSERT INTO public.contratos (propiedad_id, inquilino_id, fecha_inicio, fecha_fin, monto_alquiler, monto_inicial,
    periodicidad_meses, tipo_ajuste, fecha_proximo_aumento, dia_vencimiento, observaciones)
  VALUES (p9, i_agustin, v_inicio, (v_inicio + interval '2 years' - interval '1 day')::date, 345000, 345000,
    3, 'ipc', (d_p + interval '1 month')::date, 10, 'Demo · Aumento acordado por adelantado')
  RETURNING id INTO c9;

  -- ---------------------------------------------------------------------------
  -- 5) Historial de aumentos
  -- ---------------------------------------------------------------------------
  INSERT INTO public.aumentos (contrato_id, fecha_aplicacion, monto_anterior, monto_nuevo, porcentaje_aplicado,
    indice_tipo, modo, aplicado, fecha_creacion)
  VALUES
    (c1, (d_p - interval '3 months')::date, 300000, 327600, 9.2, 'ipc', 'calculado', true,
      (d_p - interval '3 months' + interval '2 days 11 hours')),
    (c3, (d_p - interval '6 months')::date, 650000, 719550, 10.7, 'icl', 'calculado', true,
      (d_p - interval '6 months' + interval '3 days 10 hours')),
    (c5, (d_p - interval '1 month')::date, 280000, 301000, 7.5, 'ipc', 'calculado', true,
      least(now() - interval '6 days', d_p - interval '1 month' + interval '4 days 12 hours')),
    (c6, (date_trunc('day', (d_hoy + 45) - interval '1 year') + interval '1 day')::date, 250000, 298500, 19.4, 'icl', 'calculado', true,
      ((d_hoy + 45) - interval '1 year' + interval '3 days 11 hours')),
    (c9, (d_p + interval '1 month')::date, 345000, 372600, 8.0, 'ipc', 'calculado', false,
      now() - interval '1 day 2 hours');

  -- ---------------------------------------------------------------------------
  -- 6) Reclamos con su historial de gestión
  -- ---------------------------------------------------------------------------

  -- R1 · Mariana · Pendiente · Urgente
  INSERT INTO public.reclamos (propiedad_id, inquilino_id, contrato_id, titulo, descripcion, estado, prioridad, categoria, fecha_creacion)
  VALUES (p1, i_mariana, c1, 'Pérdida de agua en la cocina',
    'Gotea la canilla de la mesada y hay agua debajo del bajo mesada. Cerré la llave de paso.',
    'Pendiente', 'Urgente', 'Plomeria', now() - interval '20 hours')
  RETURNING id INTO r;
  UPDATE public.reclamo_eventos SET fecha_creacion = now() - interval '20 hours' WHERE reclamo_id = r AND estado_anterior IS NULL;

  -- R2 · Mariana · En Proceso
  INSERT INTO public.reclamos (propiedad_id, inquilino_id, contrato_id, titulo, descripcion, estado, prioridad, categoria, fecha_creacion)
  VALUES (p1, i_mariana, c1, 'Enchufe del living sin corriente',
    'El tomacorriente al lado de la ventana dejó de funcionar. Los demás andan bien.',
    'Pendiente', 'Media', 'Electricidad', now() - interval '2 days 3 hours')
  RETURNING id INTO r;
  UPDATE public.reclamo_eventos SET fecha_creacion = now() - interval '2 days 3 hours' WHERE reclamo_id = r AND estado_anterior IS NULL;
  INSERT INTO public.reclamo_eventos (reclamo_id, estado_anterior, estado_nuevo, comentario, fecha_creacion)
  VALUES (r, 'Pendiente', 'En Proceso', 'El electricista pasa el jueves por la mañana.', now() - interval '1 day 4 hours');
  UPDATE public.reclamos SET estado = 'En Proceso' WHERE id = r;

  -- R3 · Mariana · Resuelto
  INSERT INTO public.reclamos (propiedad_id, inquilino_id, contrato_id, titulo, descripcion, estado, prioridad, categoria, fecha_creacion)
  VALUES (p1, i_mariana, c1, 'Persiana del dormitorio trabada',
    'La persiana no baja más de la mitad; parece la cinta.',
    'Pendiente', 'Baja', 'Cerrajeria', now() - interval '21 days')
  RETURNING id INTO r;
  UPDATE public.reclamo_eventos SET fecha_creacion = now() - interval '21 days' WHERE reclamo_id = r AND estado_anterior IS NULL;
  INSERT INTO public.reclamo_eventos (reclamo_id, estado_anterior, estado_nuevo, comentario, fecha_creacion)
  VALUES
    (r, 'Pendiente', 'En Proceso', 'Se coordinó la visita del técnico.', now() - interval '19 days'),
    (r, 'En Proceso', 'Resuelto', 'Se cambió la cinta y el rodillo. Quedó funcionando.', now() - interval '16 days');
  UPDATE public.reclamos SET estado = 'Resuelto' WHERE id = r;

  -- R4 · Carlos · En Proceso · Alta
  INSERT INTO public.reclamos (propiedad_id, inquilino_id, contrato_id, titulo, descripcion, estado, prioridad, categoria, fecha_creacion)
  VALUES (p2, i_carlos, c2, 'Portero eléctrico sin audio',
    'Se escucha el timbre pero no se oye a la persona desde el frente del edificio.',
    'Pendiente', 'Alta', 'Electricidad', now() - interval '5 days')
  RETURNING id INTO r;
  UPDATE public.reclamo_eventos SET fecha_creacion = now() - interval '5 days' WHERE reclamo_id = r AND estado_anterior IS NULL;
  INSERT INTO public.reclamo_eventos (reclamo_id, estado_anterior, estado_nuevo, comentario, fecha_creacion)
  VALUES (r, 'Pendiente', 'En Proceso', 'Se pidió presupuesto al técnico del consorcio.', now() - interval '4 days');
  UPDATE public.reclamos SET estado = 'En Proceso' WHERE id = r;

  -- R5 · Estudio Contable · Revisión
  INSERT INTO public.reclamos (propiedad_id, inquilino_id, contrato_id, titulo, descripcion, estado, prioridad, categoria, fecha_creacion)
  VALUES (p3, i_estudio, c3, 'Humedad en pared del baño',
    'Aparece una mancha de humedad que crece en la pared lindera con el local vecino.',
    'Pendiente', 'Media', 'Albañilería', now() - interval '10 days')
  RETURNING id INTO r;
  UPDATE public.reclamo_eventos SET fecha_creacion = now() - interval '10 days' WHERE reclamo_id = r AND estado_anterior IS NULL;
  INSERT INTO public.reclamo_eventos (reclamo_id, estado_anterior, estado_nuevo, comentario, fecha_creacion)
  VALUES
    (r, 'Pendiente', 'En Proceso', 'Visita del albañil para evaluar el origen.', now() - interval '8 days'),
    (r, 'En Proceso', 'Revision', 'Presupuesto enviado al propietario para su aprobación.', now() - interval '2 days 5 hours');
  UPDATE public.reclamos SET estado = 'Revision' WHERE id = r;

  -- R6 · Lucía · Pendiente · Urgente (recién cargado)
  INSERT INTO public.reclamos (propiedad_id, inquilino_id, contrato_id, titulo, descripcion, estado, prioridad, categoria, fecha_creacion)
  VALUES (p4, i_lucia, c4, 'El termotanque no enciende',
    'Desde esta mañana no hay agua caliente; el piloto se apaga al soltar la perilla.',
    'Pendiente', 'Urgente', 'Gas', now() - interval '3 hours')
  RETURNING id INTO r;
  UPDATE public.reclamo_eventos SET fecha_creacion = now() - interval '3 hours' WHERE reclamo_id = r AND estado_anterior IS NULL;

  -- R7 · Diego · Resuelto
  INSERT INTO public.reclamos (propiedad_id, inquilino_id, contrato_id, titulo, descripcion, estado, prioridad, categoria, fecha_creacion)
  VALUES (p5, i_diego, c5, 'Mancha en el cielorraso del baño',
    'Quedó una mancha después de la pérdida del departamento de arriba, ya reparada.',
    'Pendiente', 'Baja', 'Pintura', now() - interval '40 days')
  RETURNING id INTO r;
  UPDATE public.reclamo_eventos SET fecha_creacion = now() - interval '40 days' WHERE reclamo_id = r AND estado_anterior IS NULL;
  INSERT INTO public.reclamo_eventos (reclamo_id, estado_anterior, estado_nuevo, comentario, fecha_creacion)
  VALUES
    (r, 'Pendiente', 'En Proceso', 'Se programó la pintura para la semana próxima.', now() - interval '37 days'),
    (r, 'En Proceso', 'Resuelto', 'Se pintó el cielorraso completo.', now() - interval '31 days');
  UPDATE public.reclamos SET estado = 'Resuelto' WHERE id = r;

  -- ---------------------------------------------------------------------------
  -- 7) Usuario del portal del inquilino (si ya existe en Authentication)
  -- ---------------------------------------------------------------------------
  SELECT id INTO v_user FROM auth.users WHERE lower(email) = c_email_portal LIMIT 1;
  IF v_user IS NULL THEN
    RAISE NOTICE 'No existe el usuario %. Crealo en Authentication → Users y volvé a ejecutar este script para habilitar el portal.', c_email_portal;
  ELSE
    BEGIN
      INSERT INTO public.perfiles (id, rol) VALUES (v_user, 'inquilino')
      ON CONFLICT (id) DO UPDATE SET rol = EXCLUDED.rol;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'No se pudo crear el perfil del portal (%). Revisá la tabla perfiles.', SQLERRM;
    END;
    UPDATE public.inquilinos SET perfil_id = v_user WHERE id = i_mariana;
    RAISE NOTICE 'Portal habilitado: % → Mariana Belén López', c_email_portal;
  END IF;

  -- ---------------------------------------------------------------------------
  -- 8) Historial de actividad con fechas reales
  -- ---------------------------------------------------------------------------
  IF to_regprocedure('public.actividad_reconstruir()') IS NOT NULL THEN
    PERFORM public.actividad_reconstruir();
  ELSE
    RAISE NOTICE 'Falta la migración 20261008_actividad_sistema.sql: no se generó el historial de actividad.';
  END IF;

  RAISE NOTICE 'Demo cargada. Período operativo: %', to_char(d_p, 'MM/YYYY');
END $$;

COMMIT;
