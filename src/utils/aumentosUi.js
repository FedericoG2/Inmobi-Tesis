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

/** Período del aumento como MM/AAAA (sin el día). */
export function formatPeriodoMesAnio(fecha) {
  if (!fecha) return '—'
  const [year, month] = fecha.split('-')
  return `${month}/${year}`
}

export function diasHastaFecha(fechaIso, hoy = hoyIsoLocal()) {
  if (!fechaIso) return null
  const [y1, m1, d1] = hoy.split('-').map(Number)
  const [y2, m2, d2] = fechaIso.split('-').map(Number)
  const ms = new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()
  return Math.round(ms / 86400000)
}

export const MESES_LARGOS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

/** Capitaliza la primera letra (para etiquetas tipo "Julio"). */
export function capitalizar(texto) {
  if (!texto) return texto
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/** Clave YYYY-MM del mes de una fecha ISO. */
export function claveMes(fechaIso) {
  if (!fechaIso) return null
  return fechaIso.slice(0, 7)
}

function infoMes(anio, mes) {
  return {
    anio,
    mes,
    clave: `${anio}-${String(mes).padStart(2, '0')}`,
    nombre: MESES_LARGOS[mes - 1] ?? String(mes),
    etiqueta: `${capitalizar(MESES_LARGOS[mes - 1] ?? String(mes))} ${anio}`,
  }
}

/** Info del mes en curso. */
export function mesActualInfo(hoy = hoyIsoLocal()) {
  const [y, m] = hoy.split('-').map(Number)
  return infoMes(y, m)
}

/** Info del mes siguiente al actual. */
export function mesProximoInfo(hoy = hoyIsoLocal()) {
  const [y, m] = hoy.split('-').map(Number)
  const anio = m >= 12 ? y + 1 : y
  const mes = m >= 12 ? 1 : m + 1
  return infoMes(anio, mes)
}

/** Último día (ISO) del mes próximo. */
export function ultimoDiaMesProximoIso(hoy = hoyIsoLocal()) {
  const { anio, mes } = mesProximoInfo(hoy)
  const d = new Date(anio, mes, 0)
  const yy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

/** Días desde hoy hasta el fin del mes próximo (para cubrir todo el período). */
export function diasHastaFinMesProximo(hoy = hoyIsoLocal()) {
  return diasHastaFecha(ultimoDiaMesProximoIso(hoy), hoy)
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

/** Subtítulo relativo para la columna de fecha: "Aumento en 5 días", "Aumenta hoy", etc. */
export function etiquetaAumentoRelativa(fechaIso, hoy = hoyIsoLocal()) {
  const dias = diasHastaFecha(fechaIso, hoy)
  if (dias == null) return ''
  if (dias === 0) return 'Aumenta hoy'
  if (dias === 1) return 'Aumento mañana'
  if (dias > 1) return `Aumento en ${dias} días`
  const n = Math.abs(dias)
  return `Venció hace ${n} ${n === 1 ? 'día' : 'días'}`
}

/**
 * Traduce una propuesta del RPC a lenguaje simple para la UI.
 * @param {object} propuesta
 * @param {string} [hoy]
 * @param {{ portal?: boolean }} [opciones]
 */
export function interpretarPropuestaAumento(propuesta, hoy = hoyIsoLocal(), opciones = {}) {
  const { portal = false } = opciones
  const fechaAumento = propuesta.fecha_hasta ?? propuesta.fecha_proximo_aumento

  if (propuesta.ya_aplicado || propuesta.estado === 'aplicado') {
    return {
      etiqueta: 'aplicado',
      etiquetaTexto: 'Confirmado',
      etiquetaEstado: 'Confirmado',
      observacion: portal
        ? 'Este aumento ya está registrado en tu contrato.'
        : 'Aumento ya aplicado al contrato.',
      montoMostrar: propuesta.monto_propuesto,
      montoEsAproximado: false,
      puedeConfirmar: false,
      tono: 'emerald',
    }
  }

  if (propuesta.programado || propuesta.ya_acordado || propuesta.estado === 'programado') {
    const aproximado = Boolean(propuesta.es_aproximado)
    const fechaLabel = formatFechaAumento(fechaAumento)
    return {
      etiqueta: 'acordado',
      etiquetaTexto: 'Acordado',
      etiquetaEstado: 'Acordado',
      observacion: portal
        ? `Tu nuevo alquiler rige desde el ${fechaLabel}.${aproximado ? ' El valor podría ajustarse al publicarse el índice final.' : ''}`
        : `Aumento acordado: el nuevo monto rige desde el ${fechaLabel}. Se aplica automáticamente en esa fecha.`,
      montoMostrar: propuesta.monto_acordado ?? propuesta.monto_propuesto,
      montoEsAproximado: aproximado,
      puedeConfirmar: false,
      tono: 'sky',
    }
  }

  if (propuesta.estado === 'falta_indice') {
    return {
      etiqueta: 'sin_indices',
      etiquetaTexto: 'Sin Índices',
      etiquetaEstado: 'Sin Índices',
      observacion: portal
        ? 'Todavía no hay datos suficientes para estimar el aumento. Consultá con la inmobiliaria.'
        : 'El sistema no pudo recuperar los datos necesarios para el cálculo. Requiere revisión manual.',
      montoMostrar: null,
      montoEsAproximado: false,
      puedeConfirmar: false,
      tono: 'slate',
    }
  }

  if (propuesta.confirmable) {
    const aproximado = Boolean(propuesta.es_aproximado)
    const dias = diasHastaFecha(fechaAumento, hoy)
    const detalleIpc =
      aproximado && propuesta.ipc_meses != null && propuesta.ipc_meses_esperados != null
        ? ` (${propuesta.ipc_meses}/${propuesta.ipc_meses_esperados} meses IPC publicados)`
        : ''

    const esFuturo = dias != null && dias > 0
    let observacion
    if (aproximado) {
      observacion = portal
        ? `Estimación del aumento del alquiler${detalleIpc}. El valor final puede variar al publicarse el índice.`
        : esFuturo
          ? `Valor aproximado${detalleIpc}. Podés acordarlo ahora: el monto queda fijo y se aplica el ${formatFechaAumento(fechaAumento)}.`
          : `Valor aproximado${detalleIpc}: el índice del período aún no se publicó. Podés confirmarlo igual y el monto queda registrado.`
    } else {
      observacion = portal
        ? 'Cálculo con índices oficiales de cierre. La inmobiliaria confirmará el nuevo monto.'
        : dias != null && dias < 0
          ? `Pendiente de confirmar desde el ${formatFechaAumento(fechaAumento)}.`
          : esFuturo
            ? `Cálculo con valores oficiales. Podés acordarlo ahora: se aplica automáticamente el ${formatFechaAumento(fechaAumento)}.`
            : 'Cálculo con valores oficiales de cierre. Podés confirmar y actualizar el contrato.'
    }

    return {
      etiqueta: aproximado ? 'provisorio' : 'listo',
      etiquetaTexto: aproximado ? 'Provisorio' : 'Definitivo',
      etiquetaEstado: aproximado ? 'Provisorio' : 'Definitivo',
      observacion,
      montoMostrar: propuesta.monto_propuesto,
      montoEsAproximado: aproximado,
      puedeConfirmar: !portal,
      tono: aproximado ? 'amber' : 'emerald',
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
    observacion: portal
      ? `Estimación del aumento del alquiler${detalleIpc}. Puede variar cuando se publiquen los índices definitivos.`
      : `Estimación del aumento del alquiler${detalleIpc}. Los índices definitivos del período aún no están publicados.`,
    montoMostrar: propuesta.monto_propuesto,
    montoEsAproximado: Boolean(propuesta.es_aproximado),
    puedeConfirmar: false,
    tono: 'indigo',
  }
}

/** Alias explícito para el portal del inquilino. */
export function interpretarPropuestaAumentoPortal(propuesta, hoy = hoyIsoLocal()) {
  return interpretarPropuestaAumento(propuesta, hoy, { portal: true })
}

/** Mensaje para el botón confirmar cuando está deshabilitado. */
export function mensajeConfirmarDeshabilitado(ui) {
  if (!ui) return 'No se puede confirmar'
  if (ui.puedeConfirmar) return 'Confirmar aumento'
  if (ui.etiqueta === 'sin_indices') return 'Sin índices: requiere revisión manual'
  if (ui.etiqueta === 'acordado') return 'Ya acordado: se aplica en la fecha'
  if (ui.etiqueta === 'proyectado') return 'Se podrá confirmar desde la fecha del aumento'
  return 'No disponible para confirmar'
}

export const BADGE_INDICADOR = {
  ipc: { label: 'IPC', className: 'bg-violet-600 text-white' },
  icl: { label: 'ICL', className: 'bg-slate-600 text-white' },
}

export const TONO_SITUACION = {
  emerald: 'bg-emerald-50 text-emerald-800 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-800 ring-amber-100',
  indigo: 'bg-indigo-50 text-indigo-800 ring-indigo-100',
  sky: 'bg-sky-50 text-sky-800 ring-sky-100',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
}

/** @deprecated usar TONO_SITUACION */
export const TONO_BADGE = TONO_SITUACION

export function badgeIndicador(tipo) {
  const key = (tipo ?? '').toLowerCase()
  return BADGE_INDICADOR[key] ?? { label: (tipo ?? '—').toUpperCase(), className: 'bg-slate-500 text-white' }
}

/** Chip de índice estilo categoría de reclamos: ícono + sigla. */
export const CHIP_INDICADOR = {
  ipc: { label: 'IPC', icon: '📈' },
  icl: { label: 'ICL', icon: '🏠' },
}

export function chipIndicador(tipo) {
  const key = (tipo ?? '').toLowerCase()
  return CHIP_INDICADOR[key] ?? { label: (tipo ?? '—').toUpperCase(), icon: '📄' }
}

const formatMontoDetalle = (monto) => {
  if (monto == null) return '—'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(monto))
}

function mesSiguiente(anio, mes) {
  if (mes >= 12) return { anio: anio + 1, mes: 1 }
  return { anio, mes: mes + 1 }
}

function isoDia15(anio, mes) {
  return `${anio}-${String(mes).padStart(2, '0')}-15`
}

/**
 * Estima cuándo se publica el índice que falta (no es un dato oficial).
 * IPC: ~día 15 del mes siguiente al primer mes sin publicar (INDEC).
 * ICL: ~día 15 del mes de cierre (BCRA/CER actualiza a mitad de mes).
 */
export function estimarProximaPublicacion(propuesta) {
  const tipo = (propuesta.tipo_ajuste ?? propuesta.indice_tipo ?? '').toLowerCase()

  if (tipo === 'ipc') {
    const detalle = Array.isArray(propuesta.ipc_detalle) ? propuesta.ipc_detalle : []
    const faltante = detalle.find((m) => !m.publicado)
    if (!faltante) return null
    const sig = mesSiguiente(Number(faltante.anio), Number(faltante.mes))
    return isoDia15(sig.anio, sig.mes)
  }

  if (tipo === 'icl') {
    const fechaHasta = propuesta.fecha_hasta ?? propuesta.fecha_proximo_aumento
    if (!fechaHasta) return null
    const [y, m] = fechaHasta.split('-').map(Number)
    return isoDia15(y, m)
  }

  return null
}

/**
 * Advertencia estilo calculadora oficial cuando el valor es aproximado.
 * Devuelve null si la propuesta no es aproximada.
 */
export function advertenciaAproximado(propuesta) {
  if (!propuesta?.es_aproximado) return null

  const fechaHasta = propuesta.fecha_hasta ?? propuesta.fecha_proximo_aumento
  const estimada = estimarProximaPublicacion(propuesta)

  return {
    fechaReferencia: fechaHasta,
    fechaReferenciaLabel: formatFechaAumento(fechaHasta),
    proximaPublicacion: estimada,
    proximaPublicacionLabel: estimada ? formatFechaAumento(estimada) : null,
    texto: `Este valor es aproximado: todavía no se publicó el índice correspondiente a la fecha ${formatFechaAumento(fechaHasta)}. El monto final se conocerá al publicarse el índice y puede variar.`,
  }
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

  const ipcDetalle = Array.isArray(propuesta.ipc_detalle) ? propuesta.ipc_detalle : []

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
    ipcDetalle,
    iclValores:
      tipo === 'icl'
        ? {
            inicio: propuesta.indice_valor_inicio,
            fin: propuesta.indice_valor_fin,
            proporcion:
              propuesta.indice_valor_inicio && propuesta.indice_valor_fin
                ? Number(propuesta.indice_valor_fin) / Number(propuesta.indice_valor_inicio)
                : null,
          }
        : null,
    ipcFactor: propuesta.ipc_factor != null ? Number(propuesta.ipc_factor) : null,
    advertencia: advertenciaAproximado(propuesta),
    variacionPct: propuesta.variacion_pct,
    montoActual: propuesta.monto_actual,
    montoPropuesto: propuesta.monto_propuesto,
    esAproximado: propuesta.es_aproximado,
  }
}
