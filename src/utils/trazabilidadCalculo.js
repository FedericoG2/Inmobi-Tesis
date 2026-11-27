/*
 * Trazabilidad de los montos: de dónde sale cada aumento y qué monto rige en cada mes.
 * Arma la explicación a partir de `detalle_calculo`, que tiene la misma forma en un aumento
 * pendiente (lo calcula la pantalla) y en uno confirmado (lo guarda la base al confirmar).
 * Funciones puras: se prueban en tests/unit/trazabilidadCalculo.test.js.
 */

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

export const formatMontoTraza = (monto) =>
  monto == null || !Number.isFinite(Number(monto))
    ? '—'
    : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(monto))

const formatNumero = (valor, decimales) =>
  Number(valor).toLocaleString('es-AR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })

export const formatPctTraza = (valor, { signo = false } = {}) => {
  if (valor == null || !Number.isFinite(Number(valor))) return '—'
  const n = Number(valor)
  return `${signo && n > 0 ? '+' : ''}${formatNumero(n, 2)} %`
}

const formatFecha = (iso) => {
  if (!iso) return '—'
  const [y, m, d] = String(iso).slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

/** "2026-11-01" → "noviembre 2026". */
export function mesAnioLargo(iso) {
  if (!iso) return '—'
  const [y, m] = String(iso).split('-').map(Number)
  return MESES_LARGOS[m - 1] ? `${MESES_LARGOS[m - 1]} ${y}` : '—'
}

const mesCorto = (anio, mes) => `${MESES[mes - 1] ?? mes} ${anio}`
const claveMes = (iso) => String(iso ?? '').slice(0, 7)

const FUENTE_TEXTO = {
  ipc: 'IPC del INDEC, consultado en Argly',
  icl: 'ICL del BCRA, consultado en Argly',
}

/**
 * Explicación completa de un aumento a partir de su `detalle_calculo`.
 * `montoFinal` es el monto que quedó (puede incluir redondeo); `notas`, la observación.
 * Devuelve null si no hay detalle.
 */
export function explicarAumento(detalle, { montoFinal = null, notas = null } = {}) {
  if (!detalle || typeof detalle !== 'object') return null
  const tipo = String(detalle.tipo ?? detalle.indice_tipo ?? '').toLowerCase()
  const anterior = Number(detalle.monto_anterior)
  const final = Number(montoFinal ?? detalle.monto_nuevo)
  const manual = detalle.fuente === 'manual'

  let indices = []
  let formula = null
  let multiplicador = null
  let etiquetaMultiplicador = null

  if (tipo === 'ipc' && Array.isArray(detalle.detalle_meses) && detalle.detalle_meses.length) {
    const usados = detalle.detalle_meses.filter((m) => m.publicado !== false && m.variacion_pct != null)
    indices = detalle.detalle_meses.map((m) => ({
      etiqueta: `IPC ${mesCorto(m.anio, m.mes)}`,
      valor: m.variacion_pct == null ? 'Sin publicar' : formatPctTraza(m.variacion_pct),
      nota: m.fuente === 'manual' ? 'Carga manual' : m.variacion_pct == null ? 'No entra en el cálculo' : null,
    }))
    multiplicador = Number(detalle.factor) || usados.reduce((f, m) => f * (1 + Number(m.variacion_pct) / 100), 1)
    etiquetaMultiplicador = 'Factor acumulado'
    formula = `${usados.map((m) => `(1 + ${formatNumero(m.variacion_pct, 2)} %)`).join(' × ')} = ${formatNumero(multiplicador, 6)}`
  } else if (tipo === 'icl' && detalle.icl_inicio != null && detalle.icl_fin != null) {
    const inicio = Number(detalle.icl_inicio)
    const fin = Number(detalle.icl_fin)
    indices = [
      { etiqueta: `ICL al ${formatFecha(detalle.fecha_desde)}`, valor: formatNumero(inicio, 4), nota: manual ? 'Carga manual' : null },
      {
        etiqueta: `ICL al ${formatFecha(detalle.icl_fecha_fin_usada ?? detalle.fecha_hasta)}`,
        valor: formatNumero(fin, 4),
        nota: manual ? 'Carga manual' : null,
      },
    ]
    multiplicador = Number(detalle.proporcion) || fin / inicio
    etiquetaMultiplicador = 'Proporción'
    formula = `ICL final ÷ ICL inicial = ${formatNumero(fin, 4)} ÷ ${formatNumero(inicio, 4)} = ${formatNumero(multiplicador, 6)}`
  }

  const calculado = multiplicador && Number.isFinite(anterior) ? Math.round(anterior * multiplicador) : null
  const redondeo = calculado != null && Number.isFinite(final) && final !== calculado ? final - calculado : 0
  const variacion = Number.isFinite(anterior) && anterior > 0 && Number.isFinite(final) ? (final / anterior - 1) * 100 : null

  const pasos = [{ etiqueta: 'Monto anterior', valor: formatMontoTraza(anterior) }]
  if (multiplicador) {
    pasos.push({ etiqueta: `× ${etiquetaMultiplicador.toLowerCase()}`, valor: formatNumero(multiplicador, 6) })
    pasos.push({ etiqueta: 'Monto calculado', valor: formatMontoTraza(calculado), nota: 'Redondeado al peso' })
  }
  if (redondeo) {
    pasos.push({ etiqueta: 'Ajuste de redondeo', valor: `${redondeo > 0 ? '+' : '−'} ${formatMontoTraza(Math.abs(redondeo))}` })
  }
  pasos.push({ etiqueta: 'Monto nuevo', valor: formatMontoTraza(final), destacado: true })
  pasos.push({ etiqueta: 'Variación', valor: formatPctTraza(variacion, { signo: true }) })

  const avisos = []
  if (detalle.es_aproximado) avisos.push('Falta publicar algún índice del período: el cálculo es provisorio.')
  if (!multiplicador) avisos.push('Monto cargado sin índices: no hay fórmula para mostrar.')

  return {
    titulo: `Aumento ${tipo ? tipo.toUpperCase() : ''} de ${mesAnioLargo(detalle.fecha_hasta)}`.replace('  ', ' '),
    tipo: tipo ? tipo.toUpperCase() : null,
    periodo: `${formatFecha(detalle.fecha_desde)} al ${formatFecha(detalle.fecha_hasta)}`,
    indices,
    formula,
    etiquetaMultiplicador,
    pasos,
    calculado,
    redondeo,
    montoFinal: final,
    variacion,
    fuente: manual ? 'Índices cargados a mano porque Argly no los publicó' : (FUENTE_TEXTO[tipo] ?? null),
    avisos,
    notas: notas?.trim() || null,
  }
}

/** Último aumento confirmado que rige en el mes del período (o null si rige el monto inicial). */
export function aumentoVigenteEnMes(aumentos, periodoIso) {
  const mes = claveMes(periodoIso)
  return (
    [...(aumentos ?? [])]
      .filter((a) => claveMes(a.fecha_aplicacion) <= mes)
      .sort((a, b) => String(a.fecha_aplicacion).localeCompare(String(b.fecha_aplicacion)))
      .at(-1) ?? null
  )
}

/**
 * De dónde sale el monto de un período: el monto inicial del contrato o el último aumento que
 * rige en ese mes, con su cálculo. Si falta confirmar el aumento del mes, lo avisa.
 */
export function explicarMontoPeriodo(periodo, contrato, aumentos, { aumentoPendiente = null } = {}) {
  if (!periodo) return null
  const aumento = aumentoVigenteEnMes(aumentos, periodo.periodo)
  const lineas = []
  if (aumento) {
    lineas.push({
      etiqueta: `Rige el aumento de ${mesAnioLargo(aumento.fecha_aplicacion)}`,
      valor: `${formatMontoTraza(aumento.monto_anterior)} → ${formatMontoTraza(aumento.monto_nuevo)}`,
    })
  } else {
    lineas.push({ etiqueta: 'Monto inicial del contrato', valor: formatMontoTraza(contrato?.monto_inicial ?? periodo.monto) })
  }
  lineas.push({ etiqueta: `Monto de ${mesAnioLargo(periodo.periodo)}`, valor: formatMontoTraza(periodo.monto), destacado: true })

  return {
    titulo: `Monto de ${mesAnioLargo(periodo.periodo)}`,
    lineas,
    aumento: aumento
      ? explicarAumento(aumento.detalle_calculo, { montoFinal: aumento.monto_nuevo, notas: aumento.notas })
      : null,
    aviso:
      periodo.estado !== 'Pagado' && aumentoPendiente
        ? `Falta confirmar el aumento de ${mesAnioLargo(aumentoPendiente)}: al confirmarlo, este monto se actualiza.`
        : null,
  }
}

/** Cómo se llegó al monto actual del contrato: monto inicial y cada aumento confirmado. */
export function explicarMontoContrato(contrato, aumentos) {
  if (!contrato) return null
  const lista = [...(aumentos ?? [])].sort((a, b) => String(a.fecha_aplicacion).localeCompare(String(b.fecha_aplicacion)))
  const inicial = Number(contrato.monto_inicial ?? lista[0]?.monto_anterior ?? contrato.monto_alquiler)
  const actual = Number(contrato.monto_alquiler)
  const lineas = [{ etiqueta: `Monto inicial (${formatFecha(contrato.fecha_inicio)})`, valor: formatMontoTraza(inicial) }]
  for (const a of lista) {
    const pct = Number(a.monto_anterior) > 0 ? (Number(a.monto_nuevo) / Number(a.monto_anterior) - 1) * 100 : null
    lineas.push({
      etiqueta: `Aumento ${String(a.indice_tipo ?? '').toUpperCase()} de ${mesAnioLargo(a.fecha_aplicacion)}`.replace('  ', ' '),
      valor: `${formatMontoTraza(a.monto_nuevo)} (${formatPctTraza(pct, { signo: true })})`,
    })
  }
  lineas.push({ etiqueta: 'Monto actual', valor: formatMontoTraza(actual), destacado: true })
  const acumulada = inicial > 0 ? (actual / inicial - 1) * 100 : null
  return {
    titulo: 'Monto actual del contrato',
    lineas,
    resumen:
      lista.length === 0
        ? 'Todavía no tuvo aumentos: rige el monto inicial.'
        : `${lista.length} ${lista.length === 1 ? 'aumento confirmado' : 'aumentos confirmados'} · variación acumulada ${formatPctTraza(acumulada, { signo: true })}`,
  }
}
