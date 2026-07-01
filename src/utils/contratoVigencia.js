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

/** Etiqueta legible de duración (ej. "2 años") a partir de inicio y fin contractuales. */
export function duracionContratoLabel(fechaInicio, fechaFin) {
  if (!fechaInicio || !fechaFin) return null

  for (const o of DURACION_CONTRATO_OPCIONES) {
    if (calcularFechaFinPorDuracion(fechaInicio, o.anios) === fechaFin) {
      return o.label
    }
  }

  const [yi, mi] = fechaInicio.split('-').map(Number)
  const [yf, mf] = fechaFin.split('-').map(Number)
  let meses = (yf - yi) * 12 + (mf - mi) + 1
  if (meses < 1) meses = 1

  if (meses % 12 === 0 && meses >= 12) {
    const anios = meses / 12
    return anios === 1 ? '1 año' : `${anios} años`
  }

  return meses === 1 ? '1 mes' : `${meses} meses`
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

const ESTADO_PILL_TONOS = {
  emerald: 'bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200',
  amber: 'bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200',
  red: 'bg-red-100 text-red-800 ring-1 ring-inset ring-red-200',
  gray: 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200',
}

export function badgeEstadoContratoUi(contrato) {
  const color = colorEstadoContrato(contrato)
  return {
    label: etiquetaEstadoContrato(contrato),
    className: ESTADO_PILL_TONOS[color] ?? ESTADO_PILL_TONOS.gray,
  }
}

export function puedeFinalizarContrato(contrato) {
  return contratoComprometePropiedad(contrato)
}

export function etiquetaFinalizarContrato(contrato) {
  return contrato?.estado === 'programado' ? 'Cancelar reserva' : 'Finalizar contrato'
}

export function mensajeConfirmacionFinalizarContrato(contrato) {
  if (!contrato) return ''

  const inquilino = contrato.inquilinos?.nombre_completo ?? 'este inquilino'
  const direccion = contrato.propiedades?.direccion ?? 'esta propiedad'
  const base = `¿Finalizar el contrato de ${inquilino} en ${direccion}?`

  if (contrato.estado === 'programado') {
    return `${base} Se cancelará la reserva programada y la propiedad volverá a Disponible.`
  }

  return `${base} El contrato quedará inactivo, la propiedad se liberará y dejará de incluirse en aumentos. El historial se conserva.`
}
