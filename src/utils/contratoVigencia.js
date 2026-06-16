/** Duración del plazo contractual en años (fecha fin = inicio + N años − 1 día). */
export const DURACION_CONTRATO_OPCIONES = [
  { key: '1', label: '1 año', anios: 1 },
  { key: '2', label: '2 años', anios: 2 },
  { key: '3', label: '3 años', anios: 3 },
  { key: '4', label: '4 años', anios: 4 },
]

export function calcularFechaFinPorDuracion(fechaInicio, anios) {
  if (!fechaInicio || !anios) return ''
  const [y, m, d] = fechaInicio.split('-').map(Number)
  const fin = new Date(y + anios, m - 1, d)
  fin.setDate(fin.getDate() - 1)
  const yy = fin.getFullYear()
  const mm = String(fin.getMonth() + 1).padStart(2, '0')
  const dd = String(fin.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

/** Solapamiento inclusivo entre dos rangos ISO (YYYY-MM-DD). */
export function fechasSeSolapan(inicioA, finA, inicioB, finB) {
  if (!inicioA || !finA || !inicioB || !finB) return false
  return inicioA <= finB && inicioB <= finA
}

export const ESTADOS_CONTRATO_VIGENTES = ['programado', 'activo']

export function hoyIsoLocal() {
  const d = new Date()
  const yy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

/** Contrato activo/programado cuya fecha_fin ya pasó (plazo contractual vencido). */
export function esContratoPlazoVencido(contrato, hoy = hoyIsoLocal()) {
  if (!contrato?.fecha_fin) return false
  if (!contratoComprometePropiedad(contrato)) return false
  return contrato.fecha_fin < hoy
}

export function contratoComprometePropiedad(contrato) {
  if (contrato?.estado) {
    return ESTADOS_CONTRATO_VIGENTES.includes(contrato.estado)
  }
  return Boolean(contrato?.activo)
}

export function etiquetaEstadoContrato(contrato) {
  if (esContratoPlazoVencido(contrato)) return 'Vencido'
  if (contrato?.estado === 'programado') return 'Programado'
  if (contrato?.estado === 'activo' || contrato?.activo) return 'Activo'
  if (contrato?.estado === 'inactivo') return 'Inactivo'
  return contrato?.activo ? 'Activo' : 'Inactivo'
}

export function colorEstadoContrato(contrato) {
  if (esContratoPlazoVencido(contrato)) return 'red'
  if (contrato?.estado === 'programado') return 'amber'
  if (contrato?.estado === 'activo' || contrato?.activo) return 'emerald'
  return 'gray'
}
