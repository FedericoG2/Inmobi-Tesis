// Plazos de la bandeja (del día 11 al día 10), rezagados, deshacer y los textos que ve cada rol.
import { describe, expect, test } from 'vitest'
import {
  advertenciaAproximado,
  detalleCalculoAumento,
  esAumentoRezagado,
  interpretarPropuestaAumento,
  interpretarPropuestaAumentoPortal,
  periodoOperativoInfo,
  propuestaDesdeAumentoRegistrado,
  puedeDeshacerAumento,
} from '../../src/utils/aumentosUi'
import { calcularPropuestaAumento } from '../../src/utils/calcularAumento'

const base = {
  id: 1,
  estado: 'activo',
  tipo_ajuste: 'ipc',
  monto_alquiler: 100000,
  fecha_inicio: '2026-01-01',
  fecha_proximo_aumento: '2026-04-01',
}

describe('Período que se trabaja', () => {
  test('del 1 al 10 se sigue trabajando el mes anterior; desde el 11, el mes en curso', () => {
    expect(periodoOperativoInfo('2026-05-10').clave).toBe('2026-04')
    expect(periodoOperativoInfo('2026-05-11').clave).toBe('2026-05')
    expect(periodoOperativoInfo('2026-01-05').clave).toBe('2025-12')
  })

  test('RF-050 · sin confirmar después del día 10 del mes siguiente es rezagado', () => {
    expect(esAumentoRezagado('2026-04-01', false, '2026-05-10')).toBe(false)
    expect(esAumentoRezagado('2026-04-01', false, '2026-05-11')).toBe(true)
    expect(esAumentoRezagado('2026-04-01', true, '2026-06-01')).toBe(false)
  })

  test('RF-060 · se deshace hasta el día 10 del mes siguiente al mes de aumento', () => {
    expect(puedeDeshacerAumento({ fecha_aplicacion: '2026-04-01' }, '2026-05-10')).toBe(true)
    expect(puedeDeshacerAumento({ fecha_aplicacion: '2026-04-01' }, '2026-05-11')).toBe(false)
    expect(puedeDeshacerAumento({ fecha_aplicacion: '2026-12-01' }, '2027-01-10')).toBe(true)
  })
})

describe('Índice faltante', () => {
  const parcial = calcularPropuestaAumento({
    contrato: base,
    serieIpc: [
      { anio: 2026, mes: 1, valor: 2 },
      { anio: 2026, mes: 2, valor: 2 },
    ],
    hoy: '2026-04-12',
  })

  test('antes de confirmar avisa que el mes no se incluye y que el monto queda fijo', () => {
    const { texto } = advertenciaAproximado(parcial)
    expect(texto).toMatch(/Mar 2026/)
    expect(texto).toMatch(/queda fijo/)
    expect(texto).not.toMatch(/puede variar/)
  })

  test('en el comprobante ya confirmado dice que el índice no estaba publicado', () => {
    expect(advertenciaAproximado(parcial, { fijo: true }).texto).toMatch(/no estaba publicado al confirmar/)
  })

  test('la bandeja lo muestra como índice pendiente, pero se puede confirmar', () => {
    const ui = interpretarPropuestaAumento(parcial, '2026-04-12')
    expect(ui.etiqueta).toBe('provisorio')
    expect(ui.puedeConfirmar).toBe(true)
  })
})

describe('Portal (RF-078)', () => {
  test('sin confirmar no muestra un monto estimado', () => {
    const p = calcularPropuestaAumento({
      contrato: base,
      serieIpc: [1, 2, 3].map((mes) => ({ anio: 2026, mes, valor: 2 })),
      hoy: '2026-04-12',
    })
    const ui = interpretarPropuestaAumentoPortal(p, '2026-04-12')
    expect(ui.montoMostrar).toBeNull()
    expect(ui.puedeConfirmar).toBe(false)
  })

  test('confirmado muestra el monto nuevo y desde qué fecha rige', () => {
    const registrado = propuestaDesdeAumentoRegistrado({
      id: 7,
      contrato_id: 1,
      fecha_aplicacion: '2026-04-01',
      monto_anterior: 100000,
      monto_nuevo: 108000,
      porcentaje_aplicado: 8,
      indice_tipo: 'ipc',
      aplicado: true,
      detalle_calculo: { monto_anterior: 100000 },
    })
    const ui = interpretarPropuestaAumentoPortal(registrado)
    expect(ui.montoMostrar).toBe(108000)
    expect(ui.observacion).toMatch(/rige desde el 01\/04\/2026/)
  })
})

describe('Redondeo en la fórmula (RF-053)', () => {
  test('la fórmula muestra el monto calculado y el redondeo aparte', () => {
    const p = calcularPropuestaAumento({
      contrato: base,
      serieIpc: [1, 2, 3].map((mes) => ({ anio: 2026, mes, valor: 2 })),
      hoy: '2026-04-12',
    })
    const detalle = detalleCalculoAumento({ ...p, monto_calculado: p.monto_propuesto, monto_propuesto: 107000 }, '2026-04-12')
    expect(detalle.redondeo).toEqual({ calculado: p.monto_propuesto, final: 107000 })
    expect(detalle.formula).toMatch(/106\.121/)
  })
})
