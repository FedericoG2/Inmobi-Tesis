// Portal del inquilino, validaciones de datos y reglas de estados de reclamos.
import { describe, expect, test } from 'vitest'
import { armarResumenAlquilerInquilino } from '../../src/utils/resumenAlquilerInquilino'
import { calcularFechaFinPorDuracion, etiquetaEstadoContrato } from '../../src/utils/contratoVigencia'
import { calcularPreviewAumentos, primeraFechaAumento } from '../../src/utils/contratoAumentosPreview'
import { claveUbicacion } from '../../src/utils/normalizarUbicacion'
import { validarCalle, validarDniCuit, validarTelefono } from '../../src/utils/validaciones'
import { esTransicionEstadoValida, validarCamposReclamo } from '../../src/utils/validarReclamo'

const contrato = { estado: 'activo', monto_alquiler: 100000, fecha_inicio: '2026-01-01', fecha_fin: '2027-12-31' }

describe('Próximo pago y aumento del período (RF-078)', () => {
  test('el aumento sin confirmar del mes del próximo pago se detecta por fecha_proximo_aumento', () => {
    const r = armarResumenAlquilerInquilino({ ...contrato, dia_vencimiento: 15, fecha_proximo_aumento: '2026-04-01' }, '2026-04-12')
    expect(r.periodoLabel).toBe('Abril 2026')
    expect(r.fechaAumentoPeriodo).toBe('2026-04-01')
  })

  test('ya confirmado se sigue mostrando: la base corrió fecha_proximo_aumento y quedó fecha_ultimo_aumento', () => {
    const r = armarResumenAlquilerInquilino(
      { ...contrato, dia_vencimiento: 15, fecha_ultimo_aumento: '2026-04-01', fecha_proximo_aumento: '2026-07-01' },
      '2026-04-12'
    )
    expect(r.fechaAumentoPeriodo).toBe('2026-04-01')
  })

  test('pasado el día de vencimiento, el próximo pago es el del mes siguiente', () => {
    const r = armarResumenAlquilerInquilino({ ...contrato, dia_vencimiento: 10, fecha_proximo_aumento: '2026-07-01' }, '2026-04-20')
    expect(r.periodoLabel).toBe('Mayo 2026')
    expect(r.vencimientoCorto).toBe('10/05')
    expect(r.hayAumentoEnPeriodo).toBe(false)
  })

  test('sin día de vencimiento no se inventa uno', () => {
    const r = armarResumenAlquilerInquilino({ ...contrato, dia_vencimiento: null }, '2026-04-20')
    expect(r.vencimientoCorto).toBeNull()
    expect(r.periodoLabel).toBe('Abril 2026')
  })
})

describe('Contratos', () => {
  test('RF-038 · la fecha de fin sale del inicio y la duración', () => {
    expect(calcularFechaFinPorDuracion('2026-03-01', 2)).toBe('2028-02-29')
    expect(calcularFechaFinPorDuracion('2026-01-01', 1)).toBe('2026-12-31')
  })

  test('RF-039 · el calendario de aumentos queda dentro de la vigencia', () => {
    expect(primeraFechaAumento('2026-01-01', 3)).toBe('2026-04-01')
    const filas = calcularPreviewAumentos({ fechaInicio: '2026-01-01', fechaFin: '2026-12-31', periodicidadMeses: 3, tipoAjuste: 'ipc' })
    expect(filas.map((f) => f.fecha)).toEqual(['2026-04-01', '2026-07-01', '2026-10-01'])
  })

  test('un contrato activo con la fecha de fin vencida se muestra Vencido; el inactivo, Finalizado', () => {
    expect(etiquetaEstadoContrato({ estado: 'activo', fecha_fin: '2020-01-01' })).toBe('Vencido')
    expect(etiquetaEstadoContrato({ estado: 'inactivo', fecha_fin: '2030-01-01' })).toBe('Finalizado')
    expect(etiquetaEstadoContrato({ estado: 'programado', fecha_fin: '2030-01-01' })).toBe('Programado')
  })
})

describe('Validaciones', () => {
  test('RF-018 · DNI de 7 u 8 dígitos o CUIT de 11', () => {
    expect(validarDniCuit('30.123.456')).toBeNull()
    expect(validarDniCuit('20-30123456-7')).toBeNull()
    expect(validarDniCuit('123')).not.toBeNull()
  })

  test('el teléfono acepta separadores y exige al menos 8 dígitos', () => {
    expect(validarTelefono('351 456-7890')).toBeNull()
    expect(validarTelefono('1234')).not.toBeNull()
  })

  test('la calle no lleva la altura', () => {
    expect(validarCalle('Av. Colón')).toBeNull()
    expect(validarCalle('Av. Colón 1234')).not.toBeNull()
  })

  test('RF-029 · la ubicación se compara sin mayúsculas, tildes ni abreviaturas', () => {
    const a = claveUbicacion({ calle: 'Avenida Colón', altura: '1234', piso: 'PB', unidad: '', ciudad: 'Córdoba' })
    const b = claveUbicacion({ calle: 'av. colon', altura: '1234', piso: '0', unidad: null, ciudad: 'cordoba' })
    expect(a).toEqual(b)
  })

  test('CU-041 · título de 3 a 100 caracteres y descripción de 5 a 500', () => {
    expect(validarCamposReclamo({ titulo: 'ab', descripcion: 'ok' })).toHaveProperty('titulo')
    expect(validarCamposReclamo({ titulo: 'Pérdida', descripcion: 'Gotea el caño' })).toEqual({})
  })
})

describe('Estados de reclamos', () => {
  test('RF-076 · no se vuelve a Pendiente y un Resuelto solo pasa a En Proceso', () => {
    expect(esTransicionEstadoValida('Pendiente', 'Resuelto')).toBe(true)
    expect(esTransicionEstadoValida('En Proceso', 'Pendiente')).toBe(false)
    expect(esTransicionEstadoValida('Resuelto', 'En Proceso')).toBe(true)
    expect(esTransicionEstadoValida('Resuelto', 'Revision')).toBe(false)
  })
})
