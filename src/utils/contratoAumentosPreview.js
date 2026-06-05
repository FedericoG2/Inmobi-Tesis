/** Opciones de periodicidad en UI → meses guardados en `periodicidad_meses`. */
export const PERIODICIDAD_OPCIONES = [
  { key: 'trimestral', label: 'Trimestral', meses: 3 },
  { key: 'cuatrimestral', label: 'Cuatrimestral', meses: 4 },
  { key: 'semestral', label: 'Semestral', meses: 6 },
  { key: 'anual', label: 'Anual', meses: 12 },
]

export const TIPO_AJUSTE_OPCIONES = [
  { value: 'ipc', label: 'IPC (vivienda)' },
  { value: 'icl', label: 'ICL (comercial)' },
  { value: 'porcentaje_fijo', label: 'Porcentaje fijo acordado' },
  { value: 'manual', label: 'Manual' },
]

export const TIPO_AJUSTE_LABELS = Object.fromEntries(
  TIPO_AJUSTE_OPCIONES.map((o) => [o.value, o.label])
)

export function periodicidadMesesPorKey(key) {
  return PERIODICIDAD_OPCIONES.find((o) => o.key === key)?.meses ?? 12
}

export function periodicidadLabelPorMeses(meses) {
  return PERIODICIDAD_OPCIONES.find((o) => o.meses === meses)?.label ?? `${meses} meses`
}

/** Suma meses a una fecha ISO (YYYY-MM-DD) sin depender de UTC. */
export function sumarMeses(fechaIso, meses) {
  if (!fechaIso || !meses) return null
  const [y, m, d] = fechaIso.split('-').map(Number)
  const date = new Date(y, m - 1 + meses, d)
  const yy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export function fechasValidas(fechaInicio, fechaFin) {
  if (!fechaInicio || !fechaFin) return false
  return fechaFin > fechaInicio
}

function montoEstimadoTexto(tipoAjuste, montoNumero, porcentajeAjuste, numeroAumento) {
  if (tipoAjuste === 'porcentaje_fijo' && porcentajeAjuste != null && montoNumero > 0) {
    const factor = 1 + porcentajeAjuste / 100
    const estimado = montoNumero * factor ** numeroAumento
    return estimado
  }
  if (tipoAjuste === 'ipc' || tipoAjuste === 'icl') return 'Según índice'
  return 'A definir'
}

/**
 * Calendario de aumentos dentro de la vigencia del contrato.
 * La primera fila coincide con `fecha_proximo_aumento` al guardar.
 */
export function calcularPreviewAumentos({
  fechaInicio,
  fechaFin,
  periodicidadMeses,
  montoAlquiler,
  tipoAjuste,
  porcentajeAjuste,
  maxFilas = 6,
}) {
  if (!fechaInicio || !fechaFin || !fechasValidas(fechaInicio, fechaFin) || !periodicidadMeses) {
    return []
  }

  const montoBase = Number(montoAlquiler)
  const pct =
    tipoAjuste === 'porcentaje_fijo' && porcentajeAjuste !== '' && porcentajeAjuste != null
      ? Number(porcentajeAjuste)
      : null

  const filas = []
  let fecha = sumarMeses(fechaInicio, periodicidadMeses)
  let n = 1

  while (fecha && fecha <= fechaFin && filas.length < maxFilas) {
    const montoEst = montoEstimadoTexto(tipoAjuste, montoBase, pct, n)
    filas.push({
      numero: n,
      fecha,
      montoEstimado: montoEst,
      esMontoNumerico: typeof montoEst === 'number',
    })
    n += 1
    fecha = sumarMeses(fecha, periodicidadMeses)
  }

  return filas
}

export function primeraFechaAumento(fechaInicio, periodicidadMeses) {
  return sumarMeses(fechaInicio, periodicidadMeses)
}
