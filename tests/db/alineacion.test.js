// Reglas del documento final (secciones 8 a 11): auditoría, cierre de contratos, índices
// cargados a mano, revisión de aumentos y pago con aumento pendiente (RF-057).
import { beforeAll, describe, expect, test } from 'vitest'
import { comoUsuario, fijarHoy } from './cargarBase.js'
import { ENCARGADO, HOY, INQUILINO, prepararBase } from './escenarios.js'

let db, filas, una, escenario, crearContrato, confirmar, crearReclamo

beforeAll(async () => {
  ;({ db, filas, una, escenario, crearContrato, confirmar, crearReclamo } = await prepararBase())
}, 60000)

const comoEncargado = (sql, params) => comoUsuario(db, ENCARGADO, (tx) => tx.query(sql, params))
const periodos = (contratoId) =>
  filas(`SELECT id, periodo::text AS periodo, estado FROM periodos_alquiler WHERE contrato_id = $1 ORDER BY periodo`, [contratoId])

let archivos = 0
async function comprobante(periodoId) {
  archivos += 1
  return comoEncargado(
    `INSERT INTO comprobantes_pago (periodo_id, contrato_id, nombre, url_archivo) VALUES ($1, 0, 'pago.pdf', $2) RETURNING id`,
    [periodoId, `${periodoId}/al-${archivos}.pdf`]
  )
}

const cerrar = (contratoId, motivo, observaciones = null) =>
  comoEncargado(
    `UPDATE contratos SET estado = 'inactivo', motivo_cierre = $2, observaciones_cierre = $3 WHERE id = $1
     RETURNING motivo_cierre, observaciones_cierre, cerrado_en IS NOT NULL AS cerrado`,
    [contratoId, motivo, observaciones]
  )

describe('Auditoría (sección 8 y 11.b)', () => {
  test('alta, modificación y baja quedan con el usuario y los valores anteriores y nuevos', async () => {
    const e = await escenario()
    const c = await crearContrato(e)
    await confirmar(c.id, 108000)
    await cerrar(c.id, 'Rescindido', 'Se mudó al exterior')

    const registros = await filas(
      `SELECT tabla, operacion, usuario_id::text AS usuario, valor_anterior, valor_nuevo
       FROM auditoria WHERE tabla = 'contratos' AND registro_id = $1 ORDER BY id`,
      [c.id]
    )
    expect(registros[0]).toEqual(expect.objectContaining({ operacion: 'alta', usuario: ENCARGADO, valor_anterior: null }))
    const cierre = registros.find((r) => r.valor_nuevo?.estado === 'inactivo')
    expect(cierre).toEqual(expect.objectContaining({ operacion: 'modificacion', usuario: ENCARGADO }))
    expect(cierre.valor_anterior.estado).toBe('activo')
    expect(cierre.valor_nuevo.motivo_cierre).toBe('Rescindido')

    const tablas = (await comoEncargado(`SELECT DISTINCT tabla FROM auditoria_contrato($1)`, [c.id])).rows.map((r) => r.tabla)
    expect(tablas).toEqual(expect.arrayContaining(['contratos', 'periodos_alquiler', 'aumentos']))
  })

  test('cubre comprobantes y reclamos, y nadie la modifica ni la lee salvo el Encargado', async () => {
    const e = await escenario({ perfilInquilino: INQUILINO })
    const c = await crearContrato(e)
    const [enero] = await periodos(c.id)
    await comprobante(enero.id)
    const r = await crearReclamo(e, c.id)
    await comoEncargado(`DELETE FROM reclamos WHERE id = $1`, [r.id])

    const ops = await filas(
      `SELECT tabla, operacion FROM auditoria WHERE (tabla = 'reclamos' AND registro_id = $1) OR (tabla = 'comprobantes_pago' AND valor_nuevo->>'periodo_id' = $2)`,
      [r.id, String(enero.id)]
    )
    expect(ops).toEqual(
      expect.arrayContaining([
        { tabla: 'comprobantes_pago', operacion: 'alta' },
        { tabla: 'reclamos', operacion: 'alta' },
        { tabla: 'reclamos', operacion: 'baja' },
      ])
    )
    await expect(comoEncargado(`DELETE FROM auditoria`)).rejects.toThrow(/permission denied/)
    await expect(comoEncargado(`UPDATE auditoria SET tabla = 'x'`)).rejects.toThrow(/permission denied/)
    const vistoInquilino = await comoUsuario(db, INQUILINO, (tx) => tx.query(`SELECT count(*)::int AS n FROM auditoria`))
    expect(vistoInquilino.rows[0].n).toBe(0)
  })
})

describe('Cierre de contratos (CU-010, CU-011 y diagrama de estados)', () => {
  test('un contrato activo se finaliza o se rescinde, con observaciones', async () => {
    const e = await escenario()
    const c = await crearContrato(e)
    const r = await cerrar(c.id, 'Rescindido', '  Acuerdo de partes  ')
    expect(r.rows[0]).toEqual({ motivo_cierre: 'Rescindido', observaciones_cierre: 'Acuerdo de partes', cerrado: true })
    const evento = await una(`SELECT tipo, titulo FROM actividad WHERE contrato_id = $1 AND tipo = 'contrato_rescindido'`, [c.id])
    expect(evento.titulo).toBe('Contrato rescindido')

    const otro = await crearContrato(await escenario())
    expect((await cerrar(otro.id, null)).rows[0].motivo_cierre).toBe('Finalizado')
  })

  test('un programado solo se cancela; un activo no se cancela; el cierre no se edita', async () => {
    const programado = await crearContrato(await escenario(), { fecha_inicio: '2026-06-01', proximo: '2026-09-01' })
    await expect(cerrar(programado.id, 'Finalizado')).rejects.toThrow(/programado se cancela/)
    expect((await cerrar(programado.id, null)).rows[0].motivo_cierre).toBe('Cancelado')

    const activo = await crearContrato(await escenario())
    await expect(cerrar(activo.id, 'Cancelado')).rejects.toThrow(/Solo se cancela un contrato programado/)
    await cerrar(activo.id, 'Finalizado')
    await expect(
      comoEncargado(`UPDATE contratos SET motivo_cierre = 'Rescindido' WHERE id = $1`, [activo.id])
    ).rejects.toThrow(/no se modifican/)
  })
})

describe('Índices cargados a mano (CU-024)', () => {
  test('el Encargado carga IPC por mes e ICL por fecha; no se repiten y el inquilino no los ve', async () => {
    await comoEncargado(`INSERT INTO indices_manuales (tipo, anio, mes, valor) VALUES ('ipc', 2026, 3, 3.7)`)
    await comoEncargado(`INSERT INTO indices_manuales (tipo, anio, mes, fecha, valor) VALUES ('icl', 2026, 4, '2026-04-01', 27.41)`)
    await expect(
      comoEncargado(`INSERT INTO indices_manuales (tipo, anio, mes, valor) VALUES ('ipc', 2026, 3, 4.1)`)
    ).rejects.toThrow(/duplicate key/)
    await expect(
      comoEncargado(`INSERT INTO indices_manuales (tipo, anio, mes, fecha, valor) VALUES ('icl', 2026, 5, '2026-04-02', 27.5)`)
    ).rejects.toThrow(/indices_manuales_forma_check/)
    const visto = await comoUsuario(db, INQUILINO, (tx) => tx.query(`SELECT id FROM indices_manuales`))
    expect(visto.rows).toHaveLength(0)
  })
})

describe('Revisión de aumentos (Pendiente → Revisado → Confirmado)', () => {
  test('la revisión queda guardada hasta confirmar el aumento', async () => {
    const c = await crearContrato(await escenario())
    await comoEncargado(
      `INSERT INTO revisiones_aumento (contrato_id, fecha_aplicacion, revisado, observaciones, monto_ajustado)
       VALUES ($1, '2026-04-01', true, 'Redondeado a mil', 109000)`,
      [c.id]
    )
    expect(await filas(`SELECT id FROM revisiones_aumento WHERE contrato_id = $1`, [c.id])).toHaveLength(1)
    await confirmar(c.id, 109000)
    expect(await filas(`SELECT id FROM revisiones_aumento WHERE contrato_id = $1`, [c.id])).toHaveLength(0)
  })
})

describe('Pago con aumento pendiente (RF-057)', () => {
  test('no se confirma el pago del mes del aumento hasta confirmar el aumento', async () => {
    const c = await crearContrato(await escenario())
    const lista = await periodos(c.id)
    const marzo = lista.find((p) => p.periodo === '2026-03-01')
    const abril = lista.find((p) => p.periodo === '2026-04-01')
    await comprobante(marzo.id)
    await comprobante(abril.id)

    // Marzo no depende del aumento de abril.
    await comoEncargado(`SELECT confirmar_pago_periodo($1)`, [marzo.id])
    await expect(comoEncargado(`SELECT confirmar_pago_periodo($1)`, [abril.id])).rejects.toThrow(
      /falta confirmar el aumento de abril 2026/
    )
    await confirmar(c.id, 108000)
    await comoEncargado(`SELECT confirmar_pago_periodo($1)`, [abril.id])
    expect((await periodos(c.id)).find((p) => p.periodo === '2026-04-01').estado).toBe('Pagado')
  })
})

describe('Meses siguientes en Alquileres', () => {
  test('el Encargado genera un mes posterior al elegirlo; el inquilino no', async () => {
    const e = await escenario({ perfilInquilino: INQUILINO })
    const c = await crearContrato(e)
    await comoUsuario(db, INQUILINO, (tx) => tx.query(`SELECT generar_periodos_alquiler($1, '2026-06-01')`, [c.id]))
    expect((await periodos(c.id)).at(-1).periodo).toBe('2026-04-01')
    await comoEncargado(`SELECT generar_periodos_alquiler(NULL, '2026-06-01')`)
    expect((await periodos(c.id)).at(-1).periodo).toBe('2026-06-01')
    await fijarHoy(db, HOY)
  })
})
