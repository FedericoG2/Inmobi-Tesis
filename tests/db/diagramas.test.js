// Diagramas de transición de estados del documento (sección 10.k): cada flecha que el diagrama
// tiene se puede recorrer y cada una que no tiene la rechaza la base. Las operaciones las hace el
// Encargado de Alquileres, como desde la aplicación.
import { beforeAll, describe, expect, test } from 'vitest'
import { comoUsuario, fijarHoy } from './cargarBase.js'
import { ENCARGADO, HOY, prepararBase } from './escenarios.js'

let db, filas, una, escenario, crearContrato, estadoPropiedad, confirmar, crearReclamo, gestionar, resolver

beforeAll(async () => {
  ;({ db, filas, una, escenario, crearContrato, estadoPropiedad, confirmar, crearReclamo, gestionar, resolver } =
    await prepararBase())
}, 60000)

const comoEncargado = (sql, params) => comoUsuario(db, ENCARGADO, (tx) => tx.query(sql, params))
const estadoContrato = async (id) =>
  una(`SELECT estado::text AS estado, motivo_cierre AS motivo FROM contratos WHERE id = $1`, [id])
const cerrar = (contratoId, motivo = null) =>
  comoEncargado(`UPDATE contratos SET estado = 'inactivo', motivo_cierre = $2 WHERE id = $1`, [contratoId, motivo])
const cambiarEstadoContrato = (contratoId, estado) =>
  comoEncargado(`UPDATE contratos SET estado = $2::contrato_estado WHERE id = $1`, [contratoId, estado])
const cambiarEstadoPropiedad = (propiedadId, estado) =>
  comoEncargado(`UPDATE propiedades SET estado = $2::propiedad_estado WHERE id = $1`, [propiedadId, estado])
const periodos = (contratoId) =>
  filas(`SELECT id, periodo::text AS periodo, estado FROM periodos_alquiler WHERE contrato_id = $1 ORDER BY periodo`, [
    contratoId,
  ])
let archivos = 0
const comprobante = (periodoId) => {
  archivos += 1
  return comoEncargado(
    `INSERT INTO comprobantes_pago (periodo_id, contrato_id, nombre, url_archivo) VALUES ($1, 0, 'pago.pdf', $2)`,
    [periodoId, `${periodoId}/dte-${archivos}.pdf`]
  )
}
const estadoReclamo = async (id) => (await una(`SELECT estado::text FROM reclamos WHERE id = $1`, [id])).estado

describe('Contrato', () => {
  test('inicio → Activo si la fecha de inicio es hoy: la propiedad pasa a Alquilada y se generan los períodos', async () => {
    const e = await escenario()
    const c = await crearContrato(e, { fecha_inicio: HOY, proximo: '2026-07-12' })
    expect(c.estado).toBe('activo')
    expect(await estadoPropiedad(e.propiedad)).toBe('Alquilada')
    expect((await periodos(c.id)).map((p) => p.estado)).toEqual(['Pendiente'])
  })

  test('inicio → Programado si la fecha de inicio es posterior: la propiedad pasa a Reservada', async () => {
    const e = await escenario()
    const c = await crearContrato(e, { fecha_inicio: '2026-06-01', proximo: '2026-09-01' })
    expect(c.estado).toBe('programado')
    expect(await estadoPropiedad(e.propiedad)).toBe('Reservada')
    expect(await periodos(c.id)).toHaveLength(0)
  })

  test('Programado → Activo solo al alcanzar la fecha de inicio', async () => {
    const e = await escenario()
    const c = await crearContrato(e, { fecha_inicio: '2026-05-01', proximo: '2026-08-01' })
    await expect(cambiarEstadoContrato(c.id, 'activo')).rejects.toThrow(/cuando llega su fecha de inicio/)

    await fijarHoy(db, '2026-05-01')
    await comoEncargado(`SELECT activar_contratos_programados()`)
    await fijarHoy(db, HOY)
    expect((await estadoContrato(c.id)).estado).toBe('activo')
    expect(await estadoPropiedad(e.propiedad)).toBe('Alquilada')
  })

  test('Programado → Cancelado (cancelación antes de vigencia): la propiedad vuelve a Disponible', async () => {
    const e = await escenario()
    const c = await crearContrato(e, { fecha_inicio: '2026-06-01', proximo: '2026-09-01' })
    await cerrar(c.id)
    expect(await estadoContrato(c.id)).toEqual({ estado: 'inactivo', motivo: 'Cancelado' })
    expect(await estadoPropiedad(e.propiedad)).toBe('Disponible')
  })

  test('Activo → Finalizado (finalización manual) y Activo → Rescindido (rescisión anticipada)', async () => {
    const a = await escenario()
    const finalizado = await crearContrato(a)
    await cerrar(finalizado.id, 'Finalizado')
    expect(await estadoContrato(finalizado.id)).toEqual({ estado: 'inactivo', motivo: 'Finalizado' })
    expect(await estadoPropiedad(a.propiedad)).toBe('Disponible')

    const b = await escenario()
    const rescindido = await crearContrato(b)
    await cerrar(rescindido.id, 'Rescindido')
    expect(await estadoContrato(rescindido.id)).toEqual({ estado: 'inactivo', motivo: 'Rescindido' })
    expect(await estadoPropiedad(b.propiedad)).toBe('Disponible')
  })

  test('flechas que el diagrama no tiene: Activo → Cancelado y Activo → Programado', async () => {
    const c = await crearContrato(await escenario())
    await expect(cerrar(c.id, 'Cancelado')).rejects.toThrow(/Solo se cancela un contrato programado/)
    await expect(cambiarEstadoContrato(c.id, 'programado')).rejects.toThrow(/no vuelve a programado/)
  })

  test('Finalizado, Rescindido y Cancelado son estados finales', async () => {
    const c = await crearContrato(await escenario())
    await cerrar(c.id, 'Finalizado')
    await expect(cambiarEstadoContrato(c.id, 'activo')).rejects.toThrow(/no cambia de estado/)
    await expect(cambiarEstadoContrato(c.id, 'programado')).rejects.toThrow(/no cambia de estado/)
  })
})

describe('Propiedad', () => {
  test('una propiedad nueva se crea Disponible', async () => {
    const { id: propietario } = await una(
      `INSERT INTO propietarios (nombre_completo, dni_cuit) VALUES ('Dueño DTE', '20999000111') RETURNING id`
    )
    const crear = (estado) =>
      comoEncargado(
        `INSERT INTO propiedades (propietario_id, direccion, tipo, estado) VALUES ($1, 'Nueva 1, Córdoba', 'Casa', $2) RETURNING estado::text`,
        [propietario, estado]
      )
    expect((await crear('Disponible')).rows[0].estado).toBe('Disponible')
    await expect(crear('Mantenimiento')).rejects.toThrow(/se crea Disponible/)
    await expect(crear('Reservada')).rejects.toThrow(/se crea Disponible/)
    await expect(crear('Alquilada')).rejects.toThrow(/no puede crearse en estado Alquilada/)
  })

  test('Disponible ↔ Mantenimiento (enviar a mantenimiento y mantenimiento finalizado)', async () => {
    const e = await escenario()
    await cambiarEstadoPropiedad(e.propiedad, 'Mantenimiento')
    expect(await estadoPropiedad(e.propiedad)).toBe('Mantenimiento')
    await expect(crearContrato(e)).rejects.toThrow(/propiedades disponibles/)
    await cambiarEstadoPropiedad(e.propiedad, 'Disponible')
    expect(await estadoPropiedad(e.propiedad)).toBe('Disponible')
  })

  test('Disponible → Reservada → Alquilada → Disponible, según el contrato', async () => {
    const e = await escenario()
    const c = await crearContrato(e, { fecha_inicio: '2026-05-01', proximo: '2026-08-01' })
    expect(await estadoPropiedad(e.propiedad)).toBe('Reservada')
    await fijarHoy(db, '2026-05-01')
    await comoEncargado(`SELECT activar_contratos_programados()`)
    expect(await estadoPropiedad(e.propiedad)).toBe('Alquilada')
    await cerrar(c.id, 'Finalizado')
    await fijarHoy(db, HOY)
    expect(await estadoPropiedad(e.propiedad)).toBe('Disponible')
  })

  test('Reservada → Disponible (contrato cancelado) y Disponible → Alquilada (contrato que empieza hoy)', async () => {
    const e = await escenario()
    const reserva = await crearContrato(e, { fecha_inicio: '2026-06-01', proximo: '2026-09-01' })
    await cerrar(reserva.id)
    expect(await estadoPropiedad(e.propiedad)).toBe('Disponible')
    await crearContrato(e, { fecha_inicio: HOY, proximo: '2026-07-12' })
    expect(await estadoPropiedad(e.propiedad)).toBe('Alquilada')
  })

  test('Reservada y Alquilada no se ponen ni se sacan a mano', async () => {
    const libre = await escenario()
    await expect(cambiarEstadoPropiedad(libre.propiedad, 'Reservada')).rejects.toThrow(/solo se cambia a mano/)
    await expect(cambiarEstadoPropiedad(libre.propiedad, 'Alquilada')).rejects.toThrow(/Alquilada solo puede asignarse/)

    const alquilada = await escenario()
    await crearContrato(alquilada)
    await expect(cambiarEstadoPropiedad(alquilada.propiedad, 'Mantenimiento')).rejects.toThrow(/solo se cambia a mano/)
    await expect(cambiarEstadoPropiedad(alquilada.propiedad, 'Disponible')).rejects.toThrow(/solo se cambia a mano/)
  })

  test('baja: se elimina solo si no tiene contratos ni reclamos', async () => {
    const libre = await escenario()
    await comoEncargado(`DELETE FROM propiedades WHERE id = $1`, [libre.propiedad])
    expect(await filas(`SELECT id FROM propiedades WHERE id = $1`, [libre.propiedad])).toHaveLength(0)

    const conContrato = await escenario()
    await crearContrato(conContrato)
    await expect(comoEncargado(`DELETE FROM propiedades WHERE id = $1`, [conContrato.propiedad])).rejects.toThrow(
      /tiene contratos asociados/
    )
  })
})

describe('Período de alquiler', () => {
  test('nace Pendiente; Pendiente → Pagado solo con comprobante; Pagado → Pendiente al deshacer', async () => {
    const c = await crearContrato(await escenario())
    const marzo = (await periodos(c.id)).find((p) => p.periodo === '2026-03-01')
    expect(marzo.estado).toBe('Pendiente')

    await expect(comoEncargado(`SELECT confirmar_pago_periodo($1)`, [marzo.id])).rejects.toThrow(/no tiene comprobantes/)
    await comprobante(marzo.id)
    await comoEncargado(`SELECT confirmar_pago_periodo($1)`, [marzo.id])
    expect((await periodos(c.id)).find((p) => p.id === marzo.id).estado).toBe('Pagado')

    await expect(comprobante(marzo.id)).rejects.toThrow(/períodos pendientes/)
    await comoEncargado(`SELECT deshacer_pago_periodo($1)`, [marzo.id])
    expect((await periodos(c.id)).find((p) => p.id === marzo.id).estado).toBe('Pendiente')
    expect(await filas(`SELECT id FROM comprobantes_pago WHERE periodo_id = $1`, [marzo.id])).toHaveLength(1)
  })

  test('Pendiente → Pagado espera el aumento de ese mes (RF-057)', async () => {
    const c = await crearContrato(await escenario())
    const abril = (await periodos(c.id)).find((p) => p.periodo === '2026-04-01')
    await comprobante(abril.id)
    await expect(comoEncargado(`SELECT confirmar_pago_periodo($1)`, [abril.id])).rejects.toThrow(
      /falta confirmar el aumento de abril 2026/
    )
    await confirmar(c.id, 108000)
    await comoEncargado(`SELECT confirmar_pago_periodo($1)`, [abril.id])
    expect((await periodos(c.id)).find((p) => p.id === abril.id).estado).toBe('Pagado')
  })
})

describe('Aumento', () => {
  test('Pendiente → Revisado → Confirmado', async () => {
    const c = await crearContrato(await escenario())
    await comoEncargado(
      `INSERT INTO revisiones_aumento (contrato_id, fecha_aplicacion, revisado, monto_ajustado) VALUES ($1, '2026-04-01', true, 108000)`,
      [c.id]
    )
    const resultado = await confirmar(c.id, 108000)
    expect(resultado.confirmados).toBe(1)
    expect(await filas(`SELECT id FROM revisiones_aumento WHERE contrato_id = $1`, [c.id])).toHaveLength(0)
  })

  test('Pendiente → Confirmado solo con un cálculo válido', async () => {
    const c = await crearContrato(await escenario())
    expect((await confirmar(c.id, 0)).errores[0].error).toMatch(/Monto nuevo invalido/)
    expect((await confirmar(c.id, 108000)).confirmados).toBe(1)
    expect((await una(`SELECT monto_alquiler::int AS m FROM contratos WHERE id = $1`, [c.id])).m).toBe(108000)
  })

  test('Confirmado → Pendiente al deshacer, dentro del plazo y sin el mes pagado', async () => {
    const c = await crearContrato(await escenario())
    await confirmar(c.id, 108000)
    const { id } = await una(`SELECT id FROM aumentos WHERE contrato_id = $1`, [c.id])
    const abril = (await periodos(c.id)).find((p) => p.periodo === '2026-04-01')
    await comprobante(abril.id)
    await comoEncargado(`SELECT confirmar_pago_periodo($1)`, [abril.id])
    await expect(comoEncargado(`SELECT deshacer_aumento($1)`, [id])).rejects.toThrow(/ya está pagado/)

    await comoEncargado(`SELECT deshacer_pago_periodo($1)`, [abril.id])
    await fijarHoy(db, '2026-05-11')
    await expect(comoEncargado(`SELECT deshacer_aumento($1)`, [id])).rejects.toThrow(/quedo fijo/)
    await fijarHoy(db, HOY)
    await comoEncargado(`SELECT deshacer_aumento($1)`, [id])
    const contrato = await una(
      `SELECT monto_alquiler::int AS monto, fecha_proximo_aumento::text AS proximo FROM contratos WHERE id = $1`,
      [c.id]
    )
    expect(contrato).toEqual({ monto: 100000, proximo: '2026-04-01' })
  })
})

describe('Reclamo', () => {
  test('Pendiente → En Proceso → Revisión → Resuelto, y Resuelto → En Proceso al reabrir', async () => {
    const e = await escenario()
    const r = await crearReclamo(e, (await crearContrato(e)).id)
    expect(await estadoReclamo(r.id)).toBe('Pendiente')
    await gestionar(r.id, 'En Proceso')
    await gestionar(r.id, 'Revision')
    await gestionar(r.id, 'Resuelto')
    expect(await estadoReclamo(r.id)).toBe('Resuelto')
    await gestionar(r.id, 'En Proceso')
    expect(await estadoReclamo(r.id)).toBe('En Proceso')
  })

  test('no saltea pasos ni vuelve atrás', async () => {
    const e = await escenario()
    const r = await crearReclamo(e, (await crearContrato(e)).id)
    await expect(gestionar(r.id, 'Revision')).rejects.toThrow(/Desde Pendiente el reclamo solo pasa a En Proceso/)
    await expect(gestionar(r.id, 'Resuelto')).rejects.toThrow(/Desde Pendiente el reclamo solo pasa a En Proceso/)
    await gestionar(r.id, 'En Proceso')
    await expect(gestionar(r.id, 'Resuelto')).rejects.toThrow(/solo pasa a Revisión/)
    await expect(gestionar(r.id, 'Pendiente')).rejects.toThrow(/no puede volver al estado Pendiente/)
    await gestionar(r.id, 'Revision')
    await expect(gestionar(r.id, 'En Proceso')).rejects.toThrow(/solo pasa a Resuelto/)
  })

  test('un Resuelto solo se reabre a En Proceso', async () => {
    const e = await escenario()
    const r = await crearReclamo(e, (await crearContrato(e)).id)
    await resolver(r.id)
    await expect(gestionar(r.id, 'Revision')).rejects.toThrow(/lo deja en estado En Proceso/)
    await expect(gestionar(r.id, 'Pendiente')).rejects.toThrow(/no puede volver al estado Pendiente/)
  })
})

describe('Imágenes del reclamo (alcance del Inquilino)', () => {
  test('el inquilino adjunta imágenes al registrar el reclamo o después, salvo que esté Resuelto', async () => {
    const { INQUILINO } = await import('./escenarios.js')
    const e = await escenario({ perfilInquilino: INQUILINO })
    const r = await crearReclamo(e, (await crearContrato(e)).id, INQUILINO)
    let n = 0
    const adjuntar = () => {
      n += 1
      return comoUsuario(db, INQUILINO, (tx) =>
        tx.query(
          `INSERT INTO documentos (propiedad_id, reclamo_id, nombre, categoria, url_archivo)
           VALUES ($1, $2, $3, 'Adjunto de Reclamo', $3) RETURNING id`,
          [e.propiedad, r.id, `reclamos/${r.id}/foto-${n}.jpg`]
        )
      )
    }
    await adjuntar()
    await gestionar(r.id, 'En Proceso')
    await adjuntar()
    await gestionar(r.id, 'Revision')
    await gestionar(r.id, 'Resuelto')
    await expect(adjuntar()).rejects.toThrow()
    await db.query(`UPDATE inquilinos SET perfil_id = NULL WHERE id = $1`, [e.inquilino])
  })
})
