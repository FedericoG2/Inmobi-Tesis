// Lógica de pantalla de las reglas del documento final: RF-057, índices cargados a mano y auditoría.
import { describe, expect, test } from 'vitest'
import { accionesPeriodo, aumentoPendienteDelPeriodo, rangoPeriodo } from '../../src/utils/alquileresUi'
import { calcularPropuestaAumento, overrideDesdeIndicesManuales } from '../../src/utils/calcularAumento'
import { requiereCargaManual } from '../../src/utils/aumentosUi'
import { validarIndiceManual } from '../../src/services/indicesManualesService'
import { cambiosAuditoria, resumenAuditoria, tituloAuditoria } from '../../src/utils/auditoriaUi'

const contrato = {
  id: 1,
  estado: 'activo',
  fecha_inicio: '2026-01-15',
  fecha_fin: '2027-12-31',
  fecha_proximo_aumento: '2026-04-15',
  fecha_ultimo_aumento: null,
  monto_alquiler: 100000,
  tipo_ajuste: 'ipc',
}
const periodo = (mes, extra = {}) => ({ id: 1, periodo: mes, estado: 'Pendiente', comprobantes_pago: [{ id: 1 }], ...extra })

describe('RF-057 · pago con aumento pendiente', () => {
  test('el mes del aumento y los siguientes esperan la confirmación del aumento', () => {
    expect(aumentoPendienteDelPeriodo(periodo('2026-03-01'), contrato)).toBeNull()
    expect(aumentoPendienteDelPeriodo(periodo('2026-04-01'), contrato)).toBe('2026-04-01')
    expect(aumentoPendienteDelPeriodo(periodo('2026-05-01'), contrato)).toBe('2026-04-01')
  })

  test('no aplica a contratos cerrados ni a aumentos posteriores al fin', () => {
    expect(aumentoPendienteDelPeriodo(periodo('2026-04-01'), { ...contrato, estado: 'inactivo' })).toBeNull()
    expect(aumentoPendienteDelPeriodo(periodo('2026-04-01'), { ...contrato, fecha_fin: '2026-04-10' })).toBeNull()
  })

  test('el Encargado no confirma el pago mientras falte el aumento', () => {
    const aumentoPendiente = aumentoPendienteDelPeriodo(periodo('2026-04-01'), contrato)
    expect(accionesPeriodo(periodo('2026-04-01'), { rol: 'encargado', aumentoPendiente }).confirmarPago).toBe(false)
    expect(accionesPeriodo(periodo('2026-03-01'), { rol: 'encargado', aumentoPendiente: null }).confirmarPago).toBe(true)
  })

  test('el período cubre del inicio del contrato (o el 1) al fin de mes (o el fin del contrato)', () => {
    expect(rangoPeriodo(periodo('2026-01-01'), contrato)).toEqual({ desde: '2026-01-15', hasta: '2026-01-31' })
    expect(rangoPeriodo(periodo('2026-02-01'), contrato)).toEqual({ desde: '2026-02-01', hasta: '2026-02-28' })
    expect(rangoPeriodo(periodo('2027-12-01'), { ...contrato, fecha_fin: '2027-12-14' })).toEqual({
      desde: '2027-12-01',
      hasta: '2027-12-14',
    })
  })
})

describe('Índices cargados a mano (CU-024)', () => {
  const serieIpc = [
    { anio: 2026, mes: 1, valor: 2.2 },
    { anio: 2026, mes: 2, valor: 2.4 },
  ]
  const manuales = [
    { tipo: 'ipc', anio: 2026, mes: 2, valor: 9.9 },
    { tipo: 'ipc', anio: 2026, mes: 3, valor: 3.7 },
  ]

  test('completan solo los meses que Argly no publicó: el oficial gana', () => {
    expect(overrideDesdeIndicesManuales(contrato, { ipc: serieIpc, icl: [] }, manuales)).toEqual({ ipcMeses: { '2026-03': 3.7 } })
  })

  test('con el índice cargado a mano el aumento se puede calcular', () => {
    const override = overrideDesdeIndicesManuales(contrato, { ipc: serieIpc, icl: [] }, manuales)
    const propuesta = calcularPropuestaAumento({ contrato, serieIpc, serieIcl: [], override, hoy: '2026-04-20' })
    expect(propuesta.estado).toBe('ok')
    expect(propuesta.fuente).toBe('manual')
    expect(propuesta.monto_propuesto).toBe(Math.round(100000 * 1.022 * 1.024 * 1.037))
  })

  test('ICL: el valor manual del día del aumento reemplaza al que falta', () => {
    const icl = { ...contrato, tipo_ajuste: 'icl' }
    const serieIcl = [{ fecha: '2026-01-15', valor: 25 }]
    expect(overrideDesdeIndicesManuales(icl, { icl: serieIcl, ipc: [] }, [{ tipo: 'icl', fecha: '2026-04-15', valor: 27.5 }])).toEqual({
      iclInicio: 25,
      iclFin: 27.5,
    })
    expect(overrideDesdeIndicesManuales(icl, { icl: [...serieIcl, { fecha: '2026-04-15', valor: 27 }], ipc: [] }, [
      { tipo: 'icl', fecha: '2026-04-15', valor: 27.5 },
    ])).toBeNull()
  })

  test('validación del formulario', () => {
    expect(validarIndiceManual({ tipo: 'ipc', mes: '2026-03', valor: '3,7' }).datos).toEqual({
      tipo: 'ipc', anio: 2026, mes: 3, fecha: null, valor: 3.7,
    })
    expect(validarIndiceManual({ tipo: 'ipc', mes: '', valor: '3' }).error.message).toMatch(/mes/)
    expect(validarIndiceManual({ tipo: 'icl', fecha: '2026-04-15', valor: '0' }).error.message).toMatch(/ICL/)
  })
})

describe('Auditoría en pantalla', () => {
  test('una modificación muestra qué cambió, con el valor anterior', () => {
    const registro = {
      tabla: 'contratos',
      operacion: 'modificacion',
      valor_anterior: { id: 5, estado: 'activo', monto_alquiler: 100000, updated_at: 'a' },
      valor_nuevo: { id: 5, estado: 'inactivo', monto_alquiler: 100000, motivo_cierre: 'Rescindido', updated_at: 'b' },
    }
    expect(tituloAuditoria(registro)).toBe('Contrato · Modificación')
    expect(cambiosAuditoria(registro)).toEqual([
      { campo: 'estado', etiqueta: 'Estado', antes: 'activo', despues: 'Cerrado' },
      { campo: 'motivo_cierre', etiqueta: 'Motivo de cierre', antes: '—', despues: 'Rescindido' },
    ])
  })

  test('un alta resume la fila nueva', () => {
    const registro = {
      tabla: 'periodos_alquiler',
      operacion: 'alta',
      valor_anterior: null,
      valor_nuevo: { id: 9, periodo: '2026-04-01', monto: 108000, estado: 'Pendiente' },
    }
    expect(tituloAuditoria(registro)).toBe('Período abril 2026 · Alta')
    expect(resumenAuditoria(registro)).toMatch(/^Estado: Pendiente · Monto: \$\s108\.000$/)
  })
})

describe('Carga manual de índices: solo cuando la API no trae datos', () => {
  test('se ofrece si Argly no respondió, si falta un índice o si ya se usó uno manual', () => {
    expect(requiereCargaManual([{ estado: 'ok', fuente: 'argly' }], false)).toBe(false)
    expect(requiereCargaManual([], true)).toBe(true)
    expect(requiereCargaManual([{ estado: 'falta_indice' }], false)).toBe(true)
    expect(requiereCargaManual([{ estado: 'ok', fuente: 'manual' }], false)).toBe(true)
  })
})
