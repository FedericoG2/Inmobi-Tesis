// Reglas de negocio que controla la base (informe, secciones 2.3 y 4.2), probadas con el SQL real.
import { beforeAll, describe, expect, test } from 'vitest'
import { comoUsuario, fijarHoy } from './cargarBase.js'
import { ADMIN, ENCARGADO, HOY, INQUILINO, prepararBase } from './escenarios.js'

let db, filas, una, escenario, crearContrato, estadoPropiedad, confirmar, crearReclamo, gestionar, resolver

beforeAll(async () => {
  ;({ db, filas, una, escenario, crearContrato, estadoPropiedad, confirmar, crearReclamo, gestionar, resolver } =
    await prepararBase())
}, 60000)

describe('Propiedades', () => {
  test('RF-026 · una propiedad nueva no puede crearse Alquilada', async () => {
    await expect(
      db.query(`INSERT INTO propiedades (direccion, tipo, estado) VALUES ('X 1', 'Casa', 'Alquilada')`)
    ).rejects.toThrow(/no puede crearse en estado Alquilada/)
  })

  test('RF-027 · el contrato pasa la propiedad a Alquilada, y a Reservada si está programado', async () => {
    const activa = await escenario()
    await crearContrato(activa)
    expect(await estadoPropiedad(activa.propiedad)).toBe('Alquilada')

    const futura = await escenario()
    const c = await crearContrato(futura, { fecha_inicio: '2026-06-01', proximo: '2026-09-01' })
    expect(c.estado).toBe('programado')
    expect(await estadoPropiedad(futura.propiedad)).toBe('Reservada')
  })

  test('RF-022 · no se elimina una propiedad con contratos', async () => {
    const e = await escenario()
    await crearContrato(e)
    await expect(db.query(`DELETE FROM propiedades WHERE id = $1`, [e.propiedad])).rejects.toThrow(/contratos asociados/)
  })
})

describe('Contratos', () => {
  test('RN · solo se contrata una propiedad Disponible (no dos contratos vigentes)', async () => {
    const e = await escenario()
    await crearContrato(e)
    const otro = await una(`INSERT INTO inquilinos (nombre_completo, dni_cuit) VALUES ('Otro', '99000001') RETURNING id`)
    await expect(crearContrato({ ...e, inquilino: otro.id })).rejects.toThrow(/propiedades disponibles/)
  })

  test('RF-047 · el contrato programado se activa al llegar su fecha de inicio', async () => {
    const e = await escenario()
    const c = await crearContrato(e, { fecha_inicio: '2026-05-01', proximo: '2026-08-01' })
    expect(c.estado).toBe('programado')
    await fijarHoy(db, '2026-05-01')
    await comoUsuario(db, ENCARGADO, (tx) => tx.query(`SELECT activar_contratos_programados()`))
    await fijarHoy(db, HOY)
    expect((await una(`SELECT estado::text FROM contratos WHERE id = $1`, [c.id])).estado).toBe('activo')
    expect(await estadoPropiedad(e.propiedad)).toBe('Alquilada')
  })

  test('RN · un contrato cargado no se edita', async () => {
    const e = await escenario()
    const c = await crearContrato(e)
    await expect(db.query(`UPDATE contratos SET monto_inicial = 1 WHERE id = $1`, [c.id])).rejects.toThrow(/no se edita/)
  })

  test('RF-041 · no se elimina un contrato activo ni uno finalizado con períodos de alquiler', async () => {
    const e = await escenario()
    const c = await crearContrato(e)
    await expect(db.query(`DELETE FROM contratos WHERE id = $1`, [c.id])).rejects.toThrow(/contrato activo/)
    await db.query(`UPDATE contratos SET estado = 'inactivo' WHERE id = $1`, [c.id])
    expect(await estadoPropiedad(e.propiedad)).toBe('Disponible')
    await expect(db.query(`DELETE FROM contratos WHERE id = $1`, [c.id])).rejects.toThrow(/movimientos asociados/)
  })

  test('RF-041 · una reserva cancelada sin movimientos se elimina', async () => {
    const e = await escenario()
    const c = await crearContrato(e, { fecha_inicio: '2026-06-01', proximo: '2026-09-01' })
    await db.query(`UPDATE contratos SET estado = 'inactivo' WHERE id = $1`, [c.id])
    await db.query(`DELETE FROM contratos WHERE id = $1`, [c.id])
    expect(await filas(`SELECT id FROM contratos WHERE id = $1`, [c.id])).toHaveLength(0)
  })

  test('RF-041 · no se elimina un contrato con aumentos confirmados', async () => {
    const e = await escenario()
    const c = await crearContrato(e)
    await confirmar(c.id)
    await db.query(`UPDATE contratos SET estado = 'inactivo' WHERE id = $1`, [c.id])
    await expect(db.query(`DELETE FROM contratos WHERE id = $1`, [c.id])).rejects.toThrow(/movimientos asociados/)
  })
})

describe('Aumentos', () => {
  test('RF-048 · un aumento se confirma desde el día 11 del mes de aumento', async () => {
    const e = await escenario()
    const c = await crearContrato(e)
    await fijarHoy(db, '2026-04-10')
    const antes = await confirmar(c.id)
    await fijarHoy(db, HOY)
    expect(antes.confirmados).toBe(0)
    expect(JSON.stringify(antes.errores)).toMatch(/desde el dia 11/)
  })

  test('RF-057 · confirmar fija el monto, guarda el cálculo y corre las fechas', async () => {
    const e = await escenario()
    const c = await crearContrato(e)
    expect((await confirmar(c.id, 108000)).confirmados).toBe(1)
    const contrato = await una(
      `SELECT monto_alquiler::int AS monto, fecha_ultimo_aumento::text AS ultimo, fecha_proximo_aumento::text AS proximo
       FROM contratos WHERE id = $1`,
      [c.id]
    )
    expect(contrato).toEqual({ monto: 108000, ultimo: '2026-04-01', proximo: '2026-07-01' })
    const aumento = await una(`SELECT monto_anterior::int AS ant, detalle_calculo FROM aumentos WHERE contrato_id = $1`, [c.id])
    expect(aumento.ant).toBe(100000)
    expect(aumento.detalle_calculo.fecha_desde).toBe('2026-01-01')
  })

  test('RF-056 / CU-033 6a · no se confirma dos veces ni con monto cero', async () => {
    const e = await escenario()
    const c = await crearContrato(e)
    expect(JSON.stringify((await confirmar(c.id, 0)).errores)).toMatch(/Monto nuevo invalido/)
    await confirmar(c.id)
    // El contrato ya pasó al próximo período (julio): el de abril no vuelve a la bandeja.
    expect((await confirmar(c.id)).confirmados).toBe(0)
    expect(await filas(`SELECT id FROM aumentos WHERE contrato_id = $1`, [c.id])).toHaveLength(1)
  })

  test('RNF-027 · el Encargado no puede escribir aumentos por fuera de las funciones', async () => {
    const e = await escenario()
    const c = await crearContrato(e)
    await expect(
      comoUsuario(db, ENCARGADO, (tx) =>
        tx.query(
          `INSERT INTO aumentos (contrato_id, fecha_aplicacion, monto_anterior, monto_nuevo, modo) VALUES ($1, '2026-04-01', 1, 2, 'manual')`,
          [c.id]
        )
      )
    ).rejects.toThrow(/permission denied/)
  })

  test('RF-082 · el inquilino no puede confirmar aumentos', async () => {
    const e = await escenario()
    const c = await crearContrato(e)
    await expect(confirmar(c.id, 108000, INQUILINO)).rejects.toThrow(/Solo el Encargado/)
  })

  test('RF-060 / RNF-028 · se deshace hasta el día 10 del mes siguiente, y borra el comprobante', async () => {
    const e = await escenario()
    const c = await crearContrato(e)
    await confirmar(c.id)
    const { id } = await una(`SELECT id FROM aumentos WHERE contrato_id = $1`, [c.id])
    await db.query(
      `INSERT INTO documentos (propiedad_id, contrato_id, aumento_id, nombre, categoria, url_archivo, visible_para_inquilino)
       VALUES ($1, $2, $3, 'Comprobante-aumento-2026-04.pdf', 'Comprobante de Aumento', 'x.pdf', true)`,
      [e.propiedad, c.id, id]
    )

    await fijarHoy(db, '2026-05-11')
    await expect(comoUsuario(db, ENCARGADO, (tx) => tx.query(`SELECT deshacer_aumento($1)`, [id]))).rejects.toThrow(
      /quedo fijo/
    )
    await fijarHoy(db, '2026-05-10')
    await comoUsuario(db, ENCARGADO, (tx) => tx.query(`SELECT deshacer_aumento($1)`, [id]))
    await fijarHoy(db, HOY)

    const contrato = await una(`SELECT monto_alquiler::int AS monto, fecha_proximo_aumento::text AS proximo FROM contratos WHERE id = $1`, [c.id])
    expect(contrato).toEqual({ monto: 100000, proximo: '2026-04-01' })
    expect(await filas(`SELECT id FROM documentos WHERE contrato_id = $1`, [c.id])).toHaveLength(0)
  })

  test('RF-060 · solo se deshace el aumento más reciente', async () => {
    const e = await escenario()
    const c = await crearContrato(e)
    await confirmar(c.id, 108000)
    await fijarHoy(db, '2026-07-12')
    await confirmar(c.id, 116000)
    const [primero] = await filas(`SELECT id FROM aumentos WHERE contrato_id = $1 ORDER BY fecha_aplicacion`, [c.id])
    await expect(comoUsuario(db, ENCARGADO, (tx) => tx.query(`SELECT deshacer_aumento($1)`, [primero.id]))).rejects.toThrow(
      /mas reciente|quedo fijo/
    )
    await fijarHoy(db, HOY)
  })
})

describe('Reclamos', () => {
  test('RF-075 · un reclamo nace Pendiente aunque se envíe otro estado', async () => {
    const e = await escenario()
    const c = await crearContrato(e)
    expect((await crearReclamo(e, c.id, ENCARGADO, { estado: 'Resuelto' })).estado).toBe('Pendiente')
  })

  test('RF-067 · solo con un contrato activo del inquilino en esa propiedad', async () => {
    const e = await escenario()
    await expect(crearReclamo(e, null)).rejects.toThrow(/contrato activo/)
  })

  test('RN · el estado solo cambia desde la gestión', async () => {
    const e = await escenario()
    const c = await crearContrato(e)
    const r = await crearReclamo(e, c.id)
    await expect(
      comoUsuario(db, ENCARGADO, (tx) => tx.query(`UPDATE reclamos SET estado = 'Resuelto' WHERE id = $1`, [r.id]))
    ).rejects.toThrow(/solo se cambia desde la gestion/)
  })

  test('RF-069 / RNF-033 · la gestión deja un evento con estados, comentario y autor', async () => {
    const e = await escenario()
    const c = await crearContrato(e)
    const r = await crearReclamo(e, c.id)
    await gestionar(r.id, 'En Proceso', 'Va el plomero el jueves')
    const evento = await una(
      `SELECT estado_anterior::text AS ant, estado_nuevo::text AS nuevo, comentario, creado_por::text AS autor
       FROM reclamo_eventos WHERE reclamo_id = $1 AND estado_anterior IS NOT NULL`,
      [r.id]
    )
    expect(evento).toEqual({ ant: 'Pendiente', nuevo: 'En Proceso', comentario: 'Va el plomero el jueves', autor: ENCARGADO })
  })

  test('RF-076 / RF-070 · no vuelve a Pendiente; un Resuelto solo se reabre En Proceso', async () => {
    const e = await escenario()
    const c = await crearContrato(e)
    const r = await crearReclamo(e, c.id)
    await resolver(r.id)
    await expect(gestionar(r.id, 'Pendiente')).rejects.toThrow(/no puede volver al estado Pendiente/)
    await expect(gestionar(r.id, 'Revision')).rejects.toThrow(/lo deja en estado En Proceso/)
    await gestionar(r.id, 'En Proceso')
    expect((await una(`SELECT estado::text FROM reclamos WHERE id = $1`, [r.id])).estado).toBe('En Proceso')
  })

  test('RNF-037 · un reclamo Resuelto no se elimina', async () => {
    const e = await escenario()
    const c = await crearContrato(e)
    const r = await crearReclamo(e, c.id)
    await resolver(r.id)
    await expect(db.query(`DELETE FROM reclamos WHERE id = $1`, [r.id])).rejects.toThrow(/resuelto no se puede eliminar/)
  })

  test('RF-077 · hasta 5 imágenes por reclamo', async () => {
    const e = await escenario()
    const c = await crearContrato(e)
    const r = await crearReclamo(e, c.id)
    const imagen = () =>
      db.query(
        `INSERT INTO documentos (propiedad_id, reclamo_id, nombre, categoria, url_archivo) VALUES ($1, $2, 'foto.jpg', 'Adjunto de Reclamo', 'f.jpg')`,
        [e.propiedad, r.id]
      )
    for (let i = 0; i < 5; i++) await imagen()
    await expect(imagen()).rejects.toThrow(/hasta 5 imagenes/)
  })

  test('RNF-034 · el inquilino edita sus reclamos solo en Pendiente', async () => {
    const e = await escenario({ perfilInquilino: INQUILINO })
    const c = await crearContrato(e)
    const r = await crearReclamo(e, c.id, INQUILINO)
    const editar = () =>
      comoUsuario(db, INQUILINO, (tx) =>
        tx.query(`UPDATE reclamos SET titulo = 'Pérdida grande' WHERE id = $1 RETURNING id`, [r.id])
      )
    expect((await editar()).rows).toHaveLength(1)
    await gestionar(r.id, 'En Proceso')
    expect((await editar()).rows).toHaveLength(0)
    await db.query(`UPDATE inquilinos SET perfil_id = NULL WHERE id = $1`, [e.inquilino])
  })
})

describe('Inquilinos y propietarios', () => {
  test('RF-031 · si tuvo un contrato activo no cambia el DNI/CUIT', async () => {
    const e = await escenario()
    await crearContrato(e)
    await expect(db.query(`UPDATE inquilinos SET dni_cuit = '11111111' WHERE id = $1`, [e.inquilino])).rejects.toThrow(
      /tiene o tuvo un contrato activo/
    )
  })

  test('RF-033 · no se elimina un inquilino con contratos', async () => {
    const e = await escenario()
    await crearContrato(e)
    await expect(db.query(`DELETE FROM inquilinos WHERE id = $1`, [e.inquilino])).rejects.toThrow(/contratos asociados/)
  })

  test('RF-014 · no se elimina un propietario con propiedades', async () => {
    const e = await escenario()
    await expect(db.query(`DELETE FROM propietarios WHERE id = $1`, [e.propietario])).rejects.toThrow(/propiedades asociadas/)
  })
})

describe('Seguridad y acceso', () => {
  test('RN · una cuenta creada sin rol no recibe perfil', async () => {
    await db.query(`INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-0000000000f1', 'sinrol@prueba.com')`)
    expect(await filas(`SELECT id FROM perfiles WHERE id = '00000000-0000-0000-0000-0000000000f1'`)).toHaveLength(0)
    expect((await una(`SELECT rol::text FROM perfiles WHERE id = $1`, [ENCARGADO])).rol).toBe('encargado')
  })

  test('RNF-038 · el inquilino ve solo sus contratos, y no los programados', async () => {
    const propio = await escenario({ perfilInquilino: '00000000-0000-0000-0000-0000000000c2' })
    await db.query(`INSERT INTO auth.users (id, email, raw_app_meta_data) VALUES ('00000000-0000-0000-0000-0000000000c2', 'c2@prueba.com', '{"rol":"inquilino"}')`)
    const activo = await crearContrato(propio)
    const ajeno = await escenario()
    await crearContrato(ajeno)
    const futuro = await escenario()
    await db.query(`UPDATE inquilinos SET perfil_id = NULL WHERE id = $1`, [futuro.inquilino])
    const otraPropiedad = futuro.propiedad
    await crearContrato({ propiedad: otraPropiedad, inquilino: propio.inquilino }, { fecha_inicio: '2026-06-01', proximo: '2026-09-01' })

    const visibles = await comoUsuario(db, '00000000-0000-0000-0000-0000000000c2', (tx) => tx.query(`SELECT id FROM contratos`))
    expect(visibles.rows.map((r) => r.id)).toEqual([activo.id])
    const inquilinos = await comoUsuario(db, '00000000-0000-0000-0000-0000000000c2', (tx) => tx.query(`SELECT id FROM inquilinos`))
    expect(inquilinos.rows.map((r) => r.id)).toEqual([propio.inquilino])
  })

  test('RNF-041 · el Administrador de sistema no lee la cartera', async () => {
    await escenario()
    const vistos = await comoUsuario(db, ADMIN, async (tx) => ({
      inquilinos: (await tx.query(`SELECT id FROM inquilinos`)).rows.length,
      contratos: (await tx.query(`SELECT id FROM contratos`)).rows.length,
    }))
    expect(vistos).toEqual({ inquilinos: 0, contratos: 0 })
  })
})

describe('Actividad del sistema', () => {
  test('los cambios de negocio quedan registrados solos', async () => {
    const e = await escenario()
    const c = await crearContrato(e)
    await confirmar(c.id)
    const r = await crearReclamo(e, c.id)
    await gestionar(r.id, 'En Proceso')
    const tipos = (
      await filas(
        `SELECT DISTINCT tipo FROM actividad WHERE contrato_id = $1 OR (entidad = 'reclamo' AND entidad_id = $2)`,
        [c.id, r.id]
      )
    ).map((f) => f.tipo)
    expect(tipos).toEqual(expect.arrayContaining(['contrato_creado', 'aumento_aplicado']))
    expect(tipos.some((t) => t.startsWith('reclamo'))).toBe(true)
  })
})
