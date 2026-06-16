export function formatPeriodoIpc(anio, mes) {
  if (anio == null || mes == null) return '—'
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${meses[mes - 1] ?? mes} ${anio}`
}

export function formatValorIcl(valor) {
  if (valor == null) return '—'
  return Number(valor).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatValorIpc(valor) {
  if (valor == null) return '—'
  return `${Number(valor).toLocaleString('es-AR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  })}%`
}

export function hoyIsoLocal() {
  const d = new Date()
  const yy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export function formatFechaAumento(fecha) {
  if (!fecha) return '—'
  const [year, month, day] = fecha.split('-')
  return `${day}/${month}/${year}`
}

export function diasHastaFecha(fechaIso, hoy = hoyIsoLocal()) {
  if (!fechaIso) return null
  const [y1, m1, d1] = hoy.split('-').map(Number)
  const [y2, m2, d2] = fechaIso.split('-').map(Number)
  const ms = new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()
  return Math.round(ms / 86400000)
}

export function etiquetaFechaAumento(fechaIso, hoy = hoyIsoLocal()) {
  const dias = diasHastaFecha(fechaIso, hoy)
  if (dias == null) return '—'
  if (dias === 0) return 'Hoy'
  if (dias < 0) {
    const n = Math.abs(dias)
    if (n === 1) return 'Pendiente desde ayer'
    return `Pendiente hace ${n} días`
  }
  if (dias === 1) return 'Mañana'
  if (dias <= 30) return `En ${dias} días`
  return formatFechaAumento(fechaIso)
}

/**
 * Traduce una propuesta del RPC a lenguaje simple para la UI.
 */
export function interpretarPropuestaAumento(propuesta, hoy = hoyIsoLocal()) {
  const fechaAumento = propuesta.fecha_hasta ?? propuesta.fecha_proximo_aumento

  if (propuesta.estado === 'falta_indice') {
    return {
      etiqueta: 'sin_indices',
      etiquetaTexto: 'Sin Índices',
      etiquetaEstado: 'Sin Índices',
      observacion:
        'El sistema no pudo recuperar los datos necesarios para el cálculo. Requiere revisión manual.',
      montoMostrar: null,
      montoEsAproximado: false,
      puedeConfirmar: false,
      tono: 'slate',
    }
  }

  if (propuesta.confirmable) {
    const dias = diasHastaFecha(fechaAumento, hoy)
    const observacion =
      dias != null && dias < 0
        ? `Pendiente de confirmar desde el ${formatFechaAumento(fechaAumento)}.`
        : 'Cálculo con valores oficiales de cierre. Podés confirmar y actualizar el contrato.'
    return {
      etiqueta: 'listo',
      etiquetaTexto: 'Definitivo',
      etiquetaEstado: 'Definitivo',
      observacion,
      montoMostrar: propuesta.monto_propuesto,
      montoEsAproximado: false,
      puedeConfirmar: true,
      tono: 'emerald',
    }
  }

  const detalleIpc =
    propuesta.es_aproximado &&
    propuesta.ipc_meses != null &&
    propuesta.ipc_meses_esperados != null
      ? ` (${propuesta.ipc_meses}/${propuesta.ipc_meses_esperados} meses IPC publicados)`
      : ''

  return {
    etiqueta: 'proyectado',
    etiquetaTexto: 'Proyectado',
    etiquetaEstado: 'Proyectado',
    observacion: `Estimación del nuevo alquiler${detalleIpc}. Los índices definitivos del período aún no están publicados.`,
    montoMostrar: propuesta.monto_propuesto,
    montoEsAproximado: Boolean(propuesta.es_aproximado),
    puedeConfirmar: false,
    tono: 'indigo',
  }
}

/** Mensaje para el botón confirmar cuando está deshabilitado. */
export function mensajeConfirmarDeshabilitado(ui) {
  if (!ui) return 'No se puede confirmar'
  if (ui.puedeConfirmar) return 'Confirmar aumento'
  if (ui.etiqueta === 'sin_indices') return 'Sin índices: requiere revisión manual'
  return 'Solo confirmable en estado Definitivo'
}

export const BADGE_INDICADOR = {
  ipc: { label: 'IPC', className: 'bg-violet-600 text-white' },
  icl: { label: 'ICL', className: 'bg-slate-600 text-white' },
}

export const TONO_SITUACION = {
  emerald: 'bg-emerald-50 text-emerald-800 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-800 ring-amber-100',
  indigo: 'bg-indigo-50 text-indigo-800 ring-indigo-100',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
}

/** @deprecated usar TONO_SITUACION */
export const TONO_BADGE = TONO_SITUACION

export function badgeIndicador(tipo) {
  const key = (tipo ?? '').toLowerCase()
  return BADGE_INDICADOR[key] ?? { label: (tipo ?? '—').toUpperCase(), className: 'bg-slate-500 text-white' }
}

const formatMontoDetalle = (monto) => {
  if (monto == null) return '—'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(monto))
}

/**
 * Detalle técnico del cálculo para el modal.
 */
export function detalleCalculoAumento(propuesta, hoy = hoyIsoLocal()) {
  const ui = interpretarPropuestaAumento(propuesta, hoy)
  const tipo = (propuesta.tipo_ajuste ?? propuesta.indice_tipo ?? '').toLowerCase()
  const fechaDesde = propuesta.fecha_desde
  const fechaHasta = propuesta.fecha_hasta ?? propuesta.fecha_proximo_aumento

  const filasIndice = []

  if (tipo === 'icl') {
    if (propuesta.indice_valor_inicio != null) {
      filasIndice.push({ label: 'ICL al inicio del período', value: String(propuesta.indice_valor_inicio) })
    }
    if (propuesta.indice_valor_fin != null) {
      filasIndice.push({ label: 'ICL al cierre del período', value: String(propuesta.indice_valor_fin) })
    }
  } else if (tipo === 'ipc') {
    if (propuesta.ipc_meses != null && propuesta.ipc_meses_esperados != null) {
      filasIndice.push({
        label: 'Meses IPC del período',
        value: `${propuesta.ipc_meses} de ${propuesta.ipc_meses_esperados} publicados`,
      })
    }
    if (propuesta.ipc_factor != null) {
      filasIndice.push({
        label: 'Factor acumulado IPC',
        value: Number(propuesta.ipc_factor).toFixed(6),
      })
    }
  }

  let formula = null
  if (ui.montoMostrar != null && propuesta.monto_actual != null) {
    if (tipo === 'icl' && propuesta.indice_valor_inicio && propuesta.indice_valor_fin) {
      formula = `${formatMontoDetalle(propuesta.monto_actual)} × (${propuesta.indice_valor_fin} ÷ ${propuesta.indice_valor_inicio}) = ${formatMontoDetalle(propuesta.monto_propuesto)}`
    } else if (tipo === 'ipc' && propuesta.ipc_factor != null) {
      formula = `${formatMontoDetalle(propuesta.monto_actual)} × ${Number(propuesta.ipc_factor).toFixed(6)} = ${formatMontoDetalle(propuesta.monto_propuesto)}`
    } else {
      formula = `${formatMontoDetalle(propuesta.monto_actual)} → ${formatMontoDetalle(propuesta.monto_propuesto)}`
    }
  }

  return {
    ui,
    tipo,
    badge: badgeIndicador(tipo),
    periodo: {
      desde: fechaDesde,
      hasta: fechaHasta,
      desdeLabel: formatFechaAumento(fechaDesde),
      hastaLabel: formatFechaAumento(fechaHasta),
    },
    filasIndice,
    formula,
    variacionPct: propuesta.variacion_pct,
    montoActual: propuesta.monto_actual,
    montoPropuesto: propuesta.monto_propuesto,
    esAproximado: propuesta.es_aproximado,
  }
}
