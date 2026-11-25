// Fórmulas de ajuste del informe (sección 3.8) y reglas de la bandeja de aumentos.
import { describe, expect, test } from 'vitest'
import { calcularPropuestaAumento, iclValorEnFecha, mesesIpcPeriodo } from '../../src/utils/calcularAumento'

const contrato = (datos = {}) => ({
  id: 1,
  estado: 'activo',
  monto_alquiler: 100000,
  fecha_inicio: '2026-01-01',
  fecha_ultimo_aumento: null,
  fecha_proximo_aumento: '2026-04-01',
  ...datos,
})
const ipc = (meses) => meses.map(([mes, valor]) => ({ anio: 2026, mes, valor }))

describe('IPC', () => {
  test('los meses del período van del mes de inicio al anterior al aumento', () => {
    expect(mesesIpcPeriodo('2026-01-01', '2026-04-01').map((m) => m.clave)).toEqual(['2026-01', '2026-02', '2026-03'])
    expect(mesesIpcPeriodo('2025-11-15', '2026-02-15').map((m) => m.clave)).toEqual(['2025-11', '2025-12', '2026-01'])
  })

  test('el factor encadena las variaciones mensuales y el monto se redondea al peso', () => {
    const p = calcularPropuestaAumento({
      contrato: contrato({ tipo_ajuste: 'ipc' }),
      serieIpc: ipc([[1, 2], [2, 3], [3, 2.5]]),
      hoy: '2026-04-12',
    })
    const factor = 1.02 * 1.03 * 1.025
    expect(p.ipc_factor).toBeCloseTo(factor, 10)
    expect(p.monto_propuesto).toBe(Math.round(100000 * factor))
    expect(p.es_aproximado).toBe(false)
    expect(p.confirmable).toBe(true)
  })

  test('RF-052 · si falta un mes, calcula con los publicados y lo marca', () => {
    const p = calcularPropuestaAumento({
      contrato: contrato({ tipo_ajuste: 'ipc' }),
      serieIpc: ipc([[1, 2], [2, 3]]),
      hoy: '2026-04-12',
    })
    expect(p.es_aproximado).toBe(true)
    expect(p.ipc_meses).toBe(2)
    expect(p.ipc_meses_esperados).toBe(3)
    expect(p.monto_propuesto).toBe(Math.round(100000 * 1.02 * 1.03))
    expect(p.ipc_detalle.find((m) => m.mes === 3).publicado).toBe(false)
  })

  test('una variación de 0 o negativa se toma como no publicada (limitación del informe)', () => {
    const p = calcularPropuestaAumento({
      contrato: contrato({ tipo_ajuste: 'ipc' }),
      serieIpc: ipc([[1, 2], [2, 0], [3, -0.5]]),
      hoy: '2026-04-12',
    })
    expect(p.ipc_meses).toBe(1)
  })

  test('RF-065 · sin ningún índice no se puede confirmar', () => {
    const p = calcularPropuestaAumento({ contrato: contrato({ tipo_ajuste: 'ipc' }), serieIpc: [], hoy: '2026-04-12' })
    expect(p.estado).toBe('falta_indice')
    expect(p.confirmable).toBe(false)
    expect(p.monto_propuesto).toBeNull()
  })

  test('RF-062 · con valores cargados a mano calcula con la misma fórmula', () => {
    const p = calcularPropuestaAumento({
      contrato: contrato({ tipo_ajuste: 'ipc' }),
      serieIpc: [],
      override: { ipcMeses: { '2026-01': '2', '2026-02': '3', '2026-03': '2' } },
      hoy: '2026-04-12',
    })
    expect(p.fuente).toBe('manual')
    // 100.000 × 1,02 × 1,03 × 1,02 = 107.161,2
    expect(p.monto_propuesto).toBe(107161)
  })
})

describe('ICL', () => {
  const serie = [
    { fecha: '2025-12-30', valor: 19.5 },
    { fecha: '2026-01-01', valor: 20 },
    { fecha: '2026-03-31', valor: 21.9 },
    { fecha: '2026-04-01', valor: 22 },
  ]

  test('usa el último valor publicado con fecha menor o igual a cada extremo', () => {
    expect(iclValorEnFecha(serie, '2026-01-01').valor).toBe(20)
    expect(iclValorEnFecha(serie, '2026-03-31').valor).toBe(21.9)
  })

  test('el monto varía en la proporción ICL cierre ÷ ICL inicio', () => {
    const p = calcularPropuestaAumento({ contrato: contrato({ tipo_ajuste: 'icl' }), serieIcl: serie, hoy: '2026-04-12' })
    expect(p.monto_propuesto).toBe(Math.round(100000 * (22 / 20)))
    expect(p.variacion_pct).toBe(10)
    expect(p.es_aproximado).toBe(false)
  })

  test('si todavía no hay ICL al cierre, usa el último disponible y lo marca aproximado', () => {
    const p = calcularPropuestaAumento({
      contrato: contrato({ tipo_ajuste: 'icl' }),
      serieIcl: serie.slice(0, 3),
      hoy: '2026-04-12',
    })
    expect(p.indice_valor_fin).toBe(21.9)
    expect(p.es_aproximado).toBe(true)
  })
})

describe('Bandeja', () => {
  test('RF-048 · antes del día 11 del mes del aumento el cálculo no se puede confirmar', () => {
    const datos = { contrato: contrato({ tipo_ajuste: 'ipc' }), serieIpc: ipc([[1, 2], [2, 3], [3, 2.5]]) }
    expect(calcularPropuestaAumento({ ...datos, hoy: '2026-04-10' }).confirmable).toBe(false)
    expect(calcularPropuestaAumento({ ...datos, hoy: '2026-04-11' }).confirmable).toBe(true)
  })

  test('el período arranca en el último aumento confirmado', () => {
    const p = calcularPropuestaAumento({
      contrato: contrato({ tipo_ajuste: 'ipc', fecha_ultimo_aumento: '2026-04-01', fecha_proximo_aumento: '2026-07-01' }),
      serieIpc: ipc([[4, 1], [5, 1], [6, 1]]),
      hoy: '2026-07-12',
    })
    expect(p.fecha_desde).toBe('2026-04-01')
    expect(p.ipc_detalle.map((m) => m.mes)).toEqual([4, 5, 6])
  })
})
