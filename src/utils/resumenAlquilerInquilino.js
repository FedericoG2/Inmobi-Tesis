import { hoyIsoLocal } from './contratoVigencia'

const MESES = [
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

const MESES_CAPITALIZADOS = MESES.map((mes) => mes.charAt(0).toUpperCase() + mes.slice(1))

function mesesTotalesContrato(fechaInicio, fechaFin) {
  if (!fechaInicio || !fechaFin) return null
  const [yi, mi] = fechaInicio.split('-').map(Number)
  const [yf, mf] = fechaFin.split('-').map(Number)
  return Math.max(1, (yf - yi) * 12 + (mf - mi) + 1)
}

function mesActualContrato(fechaInicio, fechaFin, hoy) {
  const total = mesesTotalesContrato(fechaInicio, fechaFin)
  if (!fechaInicio || !total) return { actual: null, total: null }

  const [yi, mi] = fechaInicio.split('-').map(Number)
  const [yh, mh] = hoy.split('-').map(Number)
  let actual = (yh - yi) * 12 + (mh - mi) + 1
  if (actual < 1) actual = 1
  if (actual > total) actual = total
  return { actual, total }
}

function calcularProximoPeriodoAlquiler(diaVencimiento, hoy) {
  const dia = Number(diaVencimiento) || 1
  const [y, m, d] = hoy.split('-').map(Number)

  let periodYear = y
  let periodMonth = m

  if (d > dia) {
    periodMonth += 1
    if (periodMonth > 12) {
      periodMonth = 1
      periodYear += 1
    }
  }

  return { year: periodYear, month: periodMonth, diaVencimiento: dia }
}

function diasHasta(fechaFin, hoy) {
  if (!fechaFin) return null
  const [y1, m1, d1] = hoy.split('-').map(Number)
  const [y2, m2, d2] = fechaFin.split('-').map(Number)
  const ms = new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()
  return Math.max(0, Math.round(ms / 86400000))
}

export function armarResumenAlquilerInquilino(contrato, hoy = hoyIsoLocal()) {
  if (!contrato) return null

  const periodo = calcularProximoPeriodoAlquiler(contrato.dia_vencimiento, hoy)
  const { actual, total } = mesActualContrato(contrato.fecha_inicio, contrato.fecha_fin, hoy)

  let hayAumentoEnPeriodo = false
  let aumentoLabel = null
  let aumentoMesNombre = null
  if (contrato.fecha_proximo_aumento) {
    const [y, m] = contrato.fecha_proximo_aumento.split('-').map(Number)
    if (y === periodo.year && m === periodo.month) {
      hayAumentoEnPeriodo = true
      aumentoLabel = `Aumento en ${MESES_CAPITALIZADOS[m - 1]}`
      aumentoMesNombre = MESES_CAPITALIZADOS[m - 1]
    }
  }

  return {
    periodoLabel: `${MESES_CAPITALIZADOS[periodo.month - 1]} ${periodo.year}`,
    vencimientoLabel: `Vence el ${periodo.diaVencimiento} de ${MESES[periodo.month - 1]} de ${periodo.year}`,
    periodoResumenLine: `${MESES_CAPITALIZADOS[periodo.month - 1]} ${periodo.year} · Vence el ${String(periodo.diaVencimiento).padStart(2, '0')}/${String(periodo.month).padStart(2, '0')}`,
    monto: contrato.monto_alquiler,
    hayAumentoEnPeriodo,
    aumentoLabel,
    aumentoMesNombre,
    mesContratoLabel:
      actual != null && total != null ? `Mes ${actual} de ${total} del Contrato` : null,
    mesContratoCorto:
      actual != null && total != null ? `Mes ${actual}/${total} del Contrato` : null,
    mesContratoActual: actual,
    mesContratoTotal: total,
    diasRestantes: diasHasta(contrato.fecha_fin, hoy),
  }
}
