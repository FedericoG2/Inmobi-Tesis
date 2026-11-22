// Alcance 1.3: Módulo de Alquileres, portales del inquilino y del propietario y reglas de
// modificación. Se prueban con el SQL real de supabase/migrations.
import { beforeAll, describe, expect, test } from 'vitest'
import { comoUsuario, fijarHoy } from './cargarBase.js'
import { ENCARGADO, HOY, INQUILINO, PROPIETARIO, prepararBase } from './escenarios.js'

let db, filas, una, escenario, crearContrato, confirmar, crearReclamo, gestionar

beforeAll(async () => {
  ;({ db, filas, una, escenario, crearContrato, confirmar, crearReclamo, gestionar } = await prepararBase())
}, 60000)

const periodos = (contratoId) =>
  filas(
    `SELECT id, periodo::text AS periodo, estado, monto::int AS monto, fecha_vencimiento::text AS vence
     FROM periodos_alquiler WHERE contrato_id = $1 ORDER BY periodo`,
    [contratoId]
  )

let archivos = 0

/**
 * Registra un comprobante como lo hace la pantalla: sube el archivo y después crea la fila.
 * Con { subir: false } prueba solo la regla de la tabla, sin la política de Storage.
 */
async function registrarComprobante(periodoId, uid = ENCARGADO, { subir = true } = {}) {
  archivos += 1
  const ruta = `${periodoId}/${archivos}-transferencia.pdf`
  return comoUsuario(db, uid, async (tx) => {
    if (subir) await tx.query(`INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('comprobantes-pago', $1, auth.uid())`, [
      ruta,
    ])
    const r = await tx.query(
      `INSERT INTO comprobantes_pago (periodo_id, contrato_id, nombre, url_archivo)
       VALUES ($1, 0, 'transferencia.pdf', $2) RETURNING id, contrato_id`,
      [periodoId, ruta]
    )
    return { ...r.rows[0], ruta }
  })
}

const subirArchivo = (uid, ruta) =>
  comoUsuario(db, uid, (tx) =>
    tx.query(`INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('comprobantes-pago', $1, auth.uid())`, [ruta])
  )

const confirmarPago = (periodoId, uid = ENCARGADO) =>
  comoUsuario(db, uid, (tx) => tx.query(`SELECT estado FROM confirmar_pago_periodo($1)`, [periodoId]))

const deshacerPago = (periodoId, uid = ENCARGADO) =>
  comoUsuario(db, uid, (tx) => tx.query(`SELECT estado FROM deshacer_pago_periodo($1)`, [periodoId]))

const deshacerAumento = async (contratoId) => {
  const { id } = await una(`SELECT id FROM aumentos WHERE contrato_id = $1`, [contratoId])
  return comoUsuario(db, ENCARGADO, (tx) => tx.query(`SELECT deshacer_aumento($1)`, [id]))
}

describe('Períodos de alquiler', () => {
  test('cada contrato activo tiene un período por mes, desde el inicio hasta el mes en curso', async () => {
    const e = await escenario()
    const c = await crearContrato(e)
    expect(await periodos(c.id)).toEqual([
      expect.objectContaining({ periodo: '2026-01-01', estado: 'Pendiente', monto: 100000, vence: '2026-01-10' }),
      expect.objectContaining({ periodo: '2026-02-01' }),
      expect.objectContaining({ periodo: '2026-03-01' }),
      expect.objectContaining({ periodo: '2026-04-01' }),
    ])
    // Generar otra vez no duplica.
    await comoUsuario(db, ENCARGADO, (tx) => tx.query(`SELECT generar_periodos_alquiler()`))
    expect(await periodos(c.id)).toHaveLength(4)
  })

  test('un contrato programado no tiene períodos hasta que empieza', async () => {
    const e = await escenario()
    const c = await crearContrato(e, { fecha_inicio: '2026-05-15', proximo: '2026-08-01' })
    expect(await periodos(c.id)).toHaveLength(0)
    await fijarHoy(db, '2026-05-15')
    await comoUsuario(db, ENCARGADO, (tx) => tx.query(`SELECT activar_contratos_programados()`))
    await fijarHoy(db, HOY)
    expect((await periodos(c.id)).map((p) => p.periodo)).toEqual(['2026-05-01'])
  })

  test('sin sesión no se leen períodos ni comprobantes', async () => {
    const sinSesion = (sql) =>
      db.transaction(async (tx) => {
        await tx.exec('SET LOCAL ROLE anon')
        return tx.query(sql)
      })
    await expect(sinSesion('SELECT id FROM periodos_alquiler')).rejects.toThrow(/permission denied/)
    await expect(sinSesion('SELECT id FROM comprobantes_pago')).rejects.toThrow(/permission denied/)
  })

  test('nadie escribe los períodos por fuera de las funciones', async () => {
    const e = await escenario()
    const c = await crearContrato(e)
    const [enero] = await periodos(c.id)
    await expect(
      comoUsuario(db, ENCARGADO, (tx) => tx.query(`UPDATE periodos_alquiler SET estado = 'Pagado' WHERE id = $1`, [enero.id]))
    ).rejects.toThrow(/permission denied/)
  })
})

describe('Pagos', () => {
  test('el pago se confirma solo si hay comprobante, y solo lo confirma el Encargado', async () => {
    const e = await escenario()
    const c = await crearContrato(e)
    const [enero] = await periodos(c.id)
    await expect(confirmarPago(enero.id)).rejects.toThrow(/no tiene comprobantes/)

    await registrarComprobante(enero.id)
    // Registrar el comprobante no paga el período.
    expect((await periodos(c.id))[0].estado).toBe('Pendiente')
    await expect(confirmarPago(enero.id, INQUILINO)).rejects.toThrow(/Solo el Encargado/)
    expect((await confirmarPago(enero.id)).rows[0].estado).toBe('Pagado')
    await expect(confirmarPago(enero.id)).rejects.toThrow(/ya está confirmado/)
  })

  test('un período pagado no recibe comprobantes; al deshacer vuelve a Pendiente y queda el historial', async () => {
    const e = await escenario()
    const c = await crearContrato(e)
    const [enero] = await periodos(c.id)
    await registrarComprobante(enero.id)
    await confirmarPago(enero.id)
    await expect(registrarComprobante(enero.id, ENCARGADO, { subir: false })).rejects.toThrow(/períodos pendientes/)
    await expect(registrarComprobante(enero.id)).rejects.toThrow(/row-level security/)
    expect((await deshacerPago(enero.id)).rows[0].estado).toBe('Pendiente')

    const tipos = (await filas(`SELECT tipo FROM actividad WHERE entidad = 'pago' AND entidad_id = $1`, [enero.id])).map(
      (f) => f.tipo
    )
    expect(tipos).toEqual(expect.arrayContaining(['pago_comprobante', 'pago_confirmado', 'pago_deshecho']))
    // El comprobante sigue disponible después de deshacer.
    expect(await filas(`SELECT id FROM comprobantes_pago WHERE periodo_id = $1`, [enero.id])).toHaveLength(1)
  })

  test('el inquilino registra comprobantes solo de sus contratos activos y no los modifica ni elimina', async () => {
    const propio = await escenario({ perfilInquilino: INQUILINO })
    const c = await crearContrato(propio)
    const [enero, febrero] = await periodos(c.id)
    const comprobante = await registrarComprobante(enero.id, INQUILINO)
    expect(Number(comprobante.contrato_id)).toBe(Number(c.id))

    const ajeno = await escenario()
    const [eneroAjeno] = await periodos((await crearContrato(ajeno)).id)
    await expect(registrarComprobante(eneroAjeno.id, INQUILINO)).rejects.toThrow(/row-level security/)

    await expect(
      comoUsuario(db, INQUILINO, (tx) => tx.query(`DELETE FROM comprobantes_pago WHERE id = $1`, [comprobante.id]))
    ).rejects.toThrow(/permission denied/)
    await expect(
      comoUsuario(db, INQUILINO, (tx) => tx.query(`UPDATE comprobantes_pago SET nombre = 'x' WHERE id = $1`, [comprobante.id]))
    ).rejects.toThrow(/permission denied/)

    // Con el contrato finalizado, el inquilino ya no registra; el Encargado sí.
    await db.query(`UPDATE contratos SET estado = 'inactivo' WHERE id = $1`, [c.id])
    await expect(registrarComprobante(febrero.id, INQUILINO, { subir: false })).rejects.toThrow(/contratos activos/)
    await expect(registrarComprobante(febrero.id, INQUILINO)).rejects.toThrow(/row-level security/)
    await registrarComprobante(febrero.id)
  })

  test('los archivos se suben a un período permitido, se ven al registrarse y solo se borran si quedaron huérfanos', async () => {
    const propio = await escenario({ perfilInquilino: INQUILINO })
    const c = await crearContrato(propio)
    const [enero, febrero] = await periodos(c.id)
    const [eneroAjeno] = await periodos((await crearContrato(await escenario())).id)

    await expect(subirArchivo(INQUILINO, `${eneroAjeno.id}/ajeno.pdf`)).rejects.toThrow(/row-level security/)
    await expect(subirArchivo(INQUILINO, `sin-periodo.pdf`)).rejects.toThrow(/row-level security/)

    // Un archivo que no llegó a registrarse se puede borrar.
    await subirArchivo(INQUILINO, `${febrero.id}/huerfano.pdf`)
    const borrado = await comoUsuario(db, INQUILINO, (tx) =>
      tx.query(`DELETE FROM storage.objects WHERE name = $1 RETURNING id`, [`${febrero.id}/huerfano.pdf`])
    )
    expect(borrado.rows).toHaveLength(1)

    // Uno registrado se ve y no se borra.
    const { ruta } = await registrarComprobante(enero.id, INQUILINO)
    const visto = await comoUsuario(db, INQUILINO, (tx) => tx.query(`SELECT id FROM storage.objects WHERE name = $1`, [ruta]))
    expect(visto.rows).toHaveLength(1)
    const intento = await comoUsuario(db, INQUILINO, (tx) =>
      tx.query(`DELETE FROM storage.objects WHERE name = $1 RETURNING id`, [ruta])
    )
    expect(intento.rows).toHaveLength(0)
  })
})

describe('Aumentos y pagos', () => {
  test('al confirmar un aumento los períodos pendientes desde su mes toman el monto nuevo; al deshacerlo vuelven', async () => {
    const e = await escenario()
    const c = await crearContrato(e)
    await confirmar(c.id, 108000)
    expect((await periodos(c.id)).map((p) => p.monto)).toEqual([100000, 100000, 100000, 108000])
    await deshacerAumento(c.id)
    expect((await periodos(c.id)).map((p) => p.monto)).toEqual([100000, 100000, 100000, 100000])
  })

  test('no se deshace un aumento si el período de ese mes ya está pagado', async () => {
    const e = await escenario()
    const c = await crearContrato(e)
    await confirmar(c.id, 108000)
    const abril = (await periodos(c.id))[3]
    await registrarComprobante(abril.id)
    await confirmarPago(abril.id)
    await expect(deshacerAumento(c.id)).rejects.toThrow(/período de abril 2026 ya está pagado/)
  })

  test('los meses que se generan después de un aumento ya llevan el monto nuevo', async () => {
    const e = await escenario()
    const c = await crearContrato(e)
    await confirmar(c.id, 108000)
    await fijarHoy(db, '2026-05-02')
    await comoUsuario(db, ENCARGADO, (tx) => tx.query(`SELECT generar_periodos_alquiler()`))
    await fijarHoy(db, HOY)
    expect((await periodos(c.id)).at(-1)).toEqual(expect.objectContaining({ periodo: '2026-05-01', monto: 108000 }))
  })
})

describe('Portal del propietario', () => {
  test('una cuenta creada con rol propietario recibe ese rol', async () => {
    expect((await una(`SELECT rol::text FROM perfiles WHERE id = $1`, [PROPIETARIO])).rol).toBe('propietario')
  })

  test('ve solo sus propiedades, sus contratos activos y finalizados, sus pagos y sus documentos', async () => {
    const propio = await escenario({ perfilPropietario: PROPIETARIO })
    const c = await crearContrato(propio)
    const [enero] = await periodos(c.id)
    await registrarComprobante(enero.id)
    await confirmar(c.id, 108000)
    await db.query(
      `INSERT INTO documentos (propiedad_id, contrato_id, nombre, categoria, url_archivo) VALUES
         ($1, $2, 'contrato.pdf', 'Contrato Firmado', 'c.pdf'), ($1, $2, 'nota.pdf', 'Otro', 'n.pdf')`,
      [propio.propiedad, c.id]
    )
    // Otra propiedad suya con un contrato programado: todavía no se muestra.
    const otra = await una(
      `INSERT INTO propiedades (propietario_id, direccion, tipo, estado) VALUES ($1, 'Otra 1', 'Casa', 'Disponible') RETURNING id`,
      [propio.propietario]
    )
    await crearContrato({ propiedad: otra.id, inquilino: propio.inquilino }, { fecha_inicio: '2026-06-01', proximo: '2026-09-01' })
    await crearContrato(await escenario())

    const visto = await comoUsuario(db, PROPIETARIO, async (tx) => ({
      propietarios: (await tx.query(`SELECT id FROM propietarios`)).rows.map((r) => r.id),
      propiedades: (await tx.query(`SELECT id FROM propiedades ORDER BY id`)).rows.map((r) => r.id),
      contratos: (await tx.query(`SELECT id FROM contratos`)).rows.map((r) => r.id),
      aumentos: (await tx.query(`SELECT count(*)::int AS n FROM aumentos`)).rows[0].n,
      periodos: (await tx.query(`SELECT count(*)::int AS n FROM periodos_alquiler`)).rows[0].n,
      comprobantes: (await tx.query(`SELECT count(*)::int AS n FROM comprobantes_pago`)).rows[0].n,
      documentos: (await tx.query(`SELECT nombre FROM documentos`)).rows.map((r) => r.nombre),
      inquilinos: (await tx.query(`SELECT id FROM inquilinos`)).rows.length,
      nombres: (await tx.query(`SELECT inquilino_nombre FROM portal_propietario_inquilinos()`)).rows,
    }))
    expect(visto).toEqual({
      propietarios: [propio.propietario],
      propiedades: [propio.propiedad, otra.id],
      contratos: [c.id],
      aumentos: 1,
      periodos: 4,
      comprobantes: 1,
      documentos: ['contrato.pdf'],
      // La ficha del inquilino no se abre: solo el nombre, por la función del portal.
      inquilinos: 0,
      nombres: [{ inquilino_nombre: expect.stringMatching(/^Inquilino /) }],
    })
  })

  test('no registra comprobantes ni confirma pagos', async () => {
    const otroPropietario = '00000000-0000-0000-0000-0000000000b2'
    await db.query(
      `INSERT INTO auth.users (id, email, raw_app_meta_data) VALUES ($1, 'b2@prueba.com', '{"rol":"propietario"}')`,
      [otroPropietario]
    )
    const propio = await escenario({ perfilPropietario: otroPropietario })
    const [enero] = await periodos((await crearContrato(propio)).id)
    await expect(registrarComprobante(enero.id, otroPropietario)).rejects.toThrow(/row-level security|propios contratos/)
    await registrarComprobante(enero.id)
    await expect(confirmarPago(enero.id, otroPropietario)).rejects.toThrow(/Solo el Encargado/)
  })
})

describe('Reglas de modificación', () => {
  test('un propietario con propiedades no cambia el tipo de persona ni el DNI/CUIT', async () => {
    const e = await escenario()
    await expect(db.query(`UPDATE propietarios SET dni_cuit = '20999999990' WHERE id = $1`, [e.propietario])).rejects.toThrow(
      /tiene propiedades asociadas/
    )
    await db.query(`UPDATE propietarios SET telefono = '3510000000' WHERE id = $1`, [e.propietario])
  })

  test('una propiedad con contratos o reclamos no cambia el tipo ni la dirección', async () => {
    const e = await escenario()
    await db.query(`UPDATE propiedades SET calle = 'Nueva', tipo = 'Departamento' WHERE id = $1`, [e.propiedad])
    await crearContrato(e)
    await expect(db.query(`UPDATE propiedades SET calle = 'Otra' WHERE id = $1`, [e.propiedad])).rejects.toThrow(
      /contratos o reclamos asociados/
    )
    await expect(db.query(`UPDATE propiedades SET tipo = 'Casa' WHERE id = $1`, [e.propiedad])).rejects.toThrow(
      /contratos o reclamos asociados/
    )
  })

  test('un reclamo Resuelto no se edita ni recibe imágenes hasta reabrirlo', async () => {
    const e = await escenario()
    const c = await crearContrato(e)
    const r = await crearReclamo(e, c.id)
    await gestionar(r.id, 'Resuelto')
    const editar = () =>
      comoUsuario(db, ENCARGADO, (tx) => tx.query(`UPDATE reclamos SET titulo = 'Otro título' WHERE id = $1`, [r.id]))
    await expect(editar()).rejects.toThrow(/resuelto no se modifica/)
    await expect(
      db.query(
        `INSERT INTO documentos (propiedad_id, reclamo_id, nombre, categoria, url_archivo)
         VALUES ($1, $2, 'f.jpg', 'Adjunto de Reclamo', 'f.jpg')`,
        [e.propiedad, r.id]
      )
    ).rejects.toThrow(/reclamo resuelto/)
    await gestionar(r.id, 'En Proceso')
    await editar()
  })
})
