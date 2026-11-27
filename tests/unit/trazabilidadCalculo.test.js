// Trazabilidad de los montos: explicación de cada aumento y del monto de cada mes.
import { describe, expect, test } from 'vitest'
import {
  aumentoVigenteEnMes,
  explicarAumento,
  explicarMontoContrato,
  explicarMontoPeriodo,
} from '../../src/utils/trazabilidadCalculo'

const detalleIpc = {
  tipo: 'ipc',
  fecha_desde: '2026-08-01',
  fecha_hasta: '2026-11-01',
  monto_anterior: 327600,
  monto_nuevo: 346968,
  factor: 1.059122,
  fuente: 'argly',
  es_aproximado: false,
  detalle_meses: [
    { anio: 2026, mes: 8, variacion_pct: 1.7, publicado: true, fuente: 'argly' },
    { anio: 2026, mes: 9, variacion_pct: 1.9, publicado: true, fuente: 'argly' },
    { anio: 2026, mes: 10, variacion_pct: 2.2, publicado: true, fuente: 'argly' },
  ],
}

const sinEspacios = (s) => s.replace(/\s/g, ' ')

describe('explicación de un aumento', () => {
  test('IPC: índices de cada mes, factor encadenado, monto calculado y variación', () => {
    const e = explicarAumento(detalleIpc)
    expect(e.titulo).toBe('Aumento IPC de noviembre 2026')
    expect(e.periodo).toBe('01/08/2026 al 01/11/2026')
    expect(e.indices.map((i) => i.etiqueta)).toEqual(['IPC ago 2026', 'IPC sep 2026', 'IPC oct 2026'])
    expect(sinEspacios(e.formula)).toBe('(1 + 1,70 %) × (1 + 1,90 %) × (1 + 2,20 %) = 1,059122')
    expect(e.calculado).toBe(346968)
    expect(e.redondeo).toBe(0)
    expect(e.variacion).toBeCloseTo(5.91, 2)
    expect(e.fuente).toMatch(/INDEC/)
    expect(e.pasos.at(-2)).toMatchObject({ etiqueta: 'Monto nuevo', destacado: true })
  })

  test('muestra el ajuste de redondeo cuando el monto confirmado difiere del calculado', () => {
    const e = explicarAumento(detalleIpc, { montoFinal: 347000, notas: 'Redondeado a mil' })
    expect(e.redondeo).toBe(32)
    expect(e.pasos.find((p) => p.etiqueta === 'Ajuste de redondeo')).toBeTruthy()
    expect(e.notas).toBe('Redondeado a mil')
  })

  test('ICL: proporción entre el índice final y el inicial', () => {
    const e = explicarAumento({
      tipo: 'icl',
      fecha_desde: '2026-02-01',
      fecha_hasta: '2026-08-01',
      monto_anterior: 100000,
      monto_nuevo: 105000,
      icl_inicio: 20,
      icl_fin: 21,
      fuente: 'argly',
    })
    expect(e.indices).toHaveLength(2)
    expect(e.formula).toMatch(/ICL final ÷ ICL inicial/)
    expect(e.calculado).toBe(105000)
    expect(e.fuente).toMatch(/BCRA/)
  })

  test('avisa si el cálculo es provisorio o si los índices se cargaron a mano', () => {
    expect(explicarAumento({ ...detalleIpc, es_aproximado: true }).avisos[0]).toMatch(/provisorio/)
    expect(explicarAumento({ ...detalleIpc, fuente: 'manual' }).fuente).toMatch(/a mano/)
    expect(explicarAumento(null)).toBeNull()
  })
})

describe('origen del monto de un mes y del contrato', () => {
  const contrato = { monto_inicial: 300000, monto_alquiler: 346968, fecha_inicio: '2026-05-01' }
  const aumentos = [
    { fecha_aplicacion: '2026-08-01', monto_anterior: 300000, monto_nuevo: 327600, indice_tipo: 'ipc', detalle_calculo: null },
    { fecha_aplicacion: '2026-11-01', monto_anterior: 327600, monto_nuevo: 346968, indice_tipo: 'ipc', detalle_calculo: detalleIpc },
  ]

  test('cada mes toma el último aumento confirmado hasta ese mes', () => {
    expect(aumentoVigenteEnMes(aumentos, '2026-07-01')).toBeNull()
    expect(aumentoVigenteEnMes(aumentos, '2026-10-01').monto_nuevo).toBe(327600)
    expect(aumentoVigenteEnMes(aumentos, '2026-11-01').monto_nuevo).toBe(346968)
  })

  test('el período explica si rige el monto inicial o un aumento, y avisa el aumento pendiente', () => {
    const julio = explicarMontoPeriodo({ periodo: '2026-07-01', monto: 300000, estado: 'Pagado' }, contrato, aumentos)
    expect(julio.lineas[0].etiqueta).toBe('Monto inicial del contrato')
    expect(julio.aumento).toBeNull()

    const noviembre = explicarMontoPeriodo({ periodo: '2026-11-01', monto: 346968, estado: 'Pendiente' }, contrato, aumentos)
    expect(noviembre.lineas[0].etiqueta).toBe('Rige el aumento de noviembre 2026')
    expect(noviembre.aumento.calculado).toBe(346968)

    const pendiente = explicarMontoPeriodo(
      { periodo: '2027-02-01', monto: 346968, estado: 'Pendiente' },
      contrato,
      aumentos,
      { aumentoPendiente: '2027-02-01' }
    )
    expect(pendiente.aviso).toMatch(/Falta confirmar el aumento de febrero 2027/)
  })

  test('el contrato muestra el monto inicial, cada aumento y la variación acumulada', () => {
    const e = explicarMontoContrato(contrato, aumentos)
    expect(e.lineas).toHaveLength(4)
    expect(e.lineas[0].etiqueta).toBe('Monto inicial (01/05/2026)')
    expect(e.lineas.at(-1)).toMatchObject({ etiqueta: 'Monto actual', destacado: true })
    expect(e.resumen).toMatch(/2 aumentos confirmados · variación acumulada \+15,66/)
    expect(explicarMontoContrato({ ...contrato, monto_alquiler: 300000 }, []).resumen).toMatch(/Todavía no tuvo aumentos/)
  })
})
