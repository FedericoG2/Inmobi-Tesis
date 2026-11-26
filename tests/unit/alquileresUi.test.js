// Estados de pago que muestran el panel del Encargado y los portales (src/utils/alquileresUi.js).
import { describe, expect, test } from 'vitest'
import {
  accionesPeriodo,
  estadoComprobante,
  estadoPagoAlquiler,
  fechaLimitePago,
  nombrePeriodo,
  resumenPagos,
  situacionPeriodo,
} from '../../src/utils/alquileresUi'

const HOY = '2026-04-12'
const periodo = (datos = {}) => ({
  id: 1,
  periodo: '2026-04-01',
  fecha_vencimiento: '2026-04-10',
  monto: 100000,
  estado: 'Pendiente',
  comprobantes_pago: [],
  ...datos,
})
const comprobante = { id: 9, nombre: 'transferencia.pdf' }

describe('situación de un período', () => {
  test('pagado solo cuando el Encargado confirmó el pago', () => {
    expect(situacionPeriodo(periodo({ estado: 'Pagado', comprobantes_pago: [comprobante] }), HOY)).toBe('pagado')
  })

  test('con comprobante y sin confirmar queda en revisión', () => {
    expect(situacionPeriodo(periodo({ comprobantes_pago: [comprobante] }), HOY)).toBe('en_revision')
  })

  test('sin comprobante queda Pendiente: no hay estado Vencido', () => {
    expect(situacionPeriodo(periodo(), HOY)).toBe('pendiente')
    expect(situacionPeriodo(periodo({ fecha_vencimiento: null }), HOY)).toBe('pendiente')
  })

  test('el alquiler de un mes se paga hasta el día de pago del mes siguiente', () => {
    expect(fechaLimitePago(periodo({ fecha_vencimiento: '2026-11-10' }))).toBe('2026-12-10')
    expect(fechaLimitePago(periodo({ fecha_vencimiento: '2026-12-10' }))).toBe('2027-01-10')
    expect(fechaLimitePago(periodo({ fecha_vencimiento: '2026-01-28' }))).toBe('2026-02-28')
    expect(fechaLimitePago(periodo({ fecha_vencimiento: null }))).toBeNull()
  })
})

describe('resumen y estado de pago del alquiler', () => {
  const periodos = [
    periodo({ id: 1, periodo: '2026-01-01', estado: 'Pagado' }),
    periodo({ id: 2, periodo: '2026-02-01', estado: 'Pagado' }),
    periodo({ id: 3, periodo: '2026-03-01', fecha_vencimiento: '2026-03-10' }),
    periodo({ id: 4, periodo: '2026-04-01', comprobantes_pago: [comprobante], monto: 108000 }),
  ]

  test('cuenta pagados, pendientes, en revisión y el saldo pendiente', () => {
    expect(resumenPagos(periodos)).toEqual({
      total: 4,
      pagados: 2,
      pendientes: 2,
      enRevision: 1,
      montoPendiente: 208000,
    })
  })

  test('los comprobantes por revisar tienen prioridad, después lo pendiente', () => {
    expect(estadoPagoAlquiler(resumenPagos(periodos))).toBe('revisar')
    expect(estadoPagoAlquiler(resumenPagos(periodos.slice(0, 3)))).toBe('pendiente')
    expect(estadoPagoAlquiler(resumenPagos(periodos.slice(0, 2)))).toBe('al_dia')
  })
})

describe('comprobantes y acciones por rol', () => {
  test('el estado del comprobante sale del período: se confirma el pago, no el comprobante', () => {
    expect(estadoComprobante(periodo()).label).toBe('En revisión')
    expect(estadoComprobante(periodo({ estado: 'Pagado' })).label).toBe('Pago confirmado')
  })

  test('el Encargado confirma solo con comprobante y deshace solo lo pagado', () => {
    expect(accionesPeriodo(periodo(), { rol: 'encargado' })).toEqual({
      registrarComprobante: true,
      confirmarPago: false,
      deshacerPago: false,
    })
    expect(accionesPeriodo(periodo({ comprobantes_pago: [comprobante] }), { rol: 'encargado' }).confirmarPago).toBe(true)
    expect(accionesPeriodo(periodo({ estado: 'Pagado' }), { rol: 'encargado' })).toEqual({
      registrarComprobante: false,
      confirmarPago: false,
      deshacerPago: true,
    })
  })

  test('el inquilino registra solo en contratos activos; el propietario solo consulta', () => {
    expect(accionesPeriodo(periodo(), { rol: 'inquilino', contratoActivo: true }).registrarComprobante).toBe(true)
    expect(accionesPeriodo(periodo(), { rol: 'inquilino', contratoActivo: false }).registrarComprobante).toBe(false)
    expect(accionesPeriodo(periodo({ estado: 'Pagado' }), { rol: 'inquilino', contratoActivo: true }).registrarComprobante).toBe(false)
    expect(Object.values(accionesPeriodo(periodo(), { rol: 'propietario' }))).toEqual([false, false, false])
  })

  test('nombre del período en castellano', () => {
    expect(nombrePeriodo('2026-04-01')).toBe('Abril 2026')
    expect(nombrePeriodo(null)).toBe('—')
  })
})

describe('textos de Aumentos', () => {
  test('el período de un aumento no usa la palabra "venció": la situación la da el estado', async () => {
    const { etiquetaPeriodoAumento } = await import('../../src/utils/aumentosUi')
    expect(etiquetaPeriodoAumento('2026-11-01')).toBe('Aumento de Noviembre')
    expect(etiquetaPeriodoAumento('2026-11-01', '2026-11-26')).not.toMatch(/venci/i)
  })
})
