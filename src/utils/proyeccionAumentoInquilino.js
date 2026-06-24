const TIPOS_INDEXADOS = new Set(['ipc', 'icl'])

/** Indica si conviene consultar la proyección de aumento para el contrato. */
export function contratoPuedeProyectarAumento(contrato, resumen) {
  if (!contrato?.fecha_proximo_aumento) return false
  if (!TIPOS_INDEXADOS.has((contrato.tipo_ajuste ?? '').toLowerCase())) return false
  if (contrato.fecha_fin && contrato.fecha_proximo_aumento > contrato.fecha_fin) return false
  return Boolean(resumen?.hayAumentoEnPeriodo)
}

export function formatMontoInquilino(monto) {
  if (monto == null || monto === '') return '—'
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(monto))
}
