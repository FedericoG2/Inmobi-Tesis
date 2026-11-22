/*
 * Estados de pago de los períodos de alquiler, para las tres pantallas que los muestran
 * (Encargado, portal del inquilino y portal del propietario). Funciones puras: se prueban
 * en tests/unit/alquileresUi.test.js.
 */

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/** "2026-04-01" → "Abril 2026". */
export function nombrePeriodo(periodoIso) {
  if (!periodoIso) return '—'
  const [anio, mes] = periodoIso.split('-').map(Number)
  const nombre = MESES[mes - 1]
  return nombre ? `${nombre[0].toUpperCase()}${nombre.slice(1)} ${anio}` : '—'
}

export const cantidadComprobantes = (periodo) => periodo?.comprobantes_pago?.length ?? 0

/**
 * Situación de un período para mostrar:
 *   pagado      → el Encargado confirmó el pago.
 *   en_revision → pendiente con al menos un comprobante: falta que el Encargado lo confirme.
 *   vencido     → pendiente, sin comprobante y con el vencimiento ya pasado.
 *   pendiente   → pendiente, todavía en plazo.
 */
export function situacionPeriodo(periodo, hoyIso) {
  if (!periodo) return 'pendiente'
  if (periodo.estado === 'Pagado') return 'pagado'
  if (cantidadComprobantes(periodo) > 0) return 'en_revision'
  if (periodo.fecha_vencimiento && hoyIso && periodo.fecha_vencimiento < hoyIso) return 'vencido'
  return 'pendiente'
}

export const SITUACION_PERIODO = {
  pagado: { label: 'Pagado', tone: 'success' },
  en_revision: { label: 'Comprobante en revisión', tone: 'brand' },
  vencido: { label: 'Vencido', tone: 'danger' },
  pendiente: { label: 'Pendiente', tone: 'warning' },
}

/** Totales de un contrato a partir de sus períodos. */
export function resumenPagos(periodos = [], hoyIso) {
  const resumen = { total: 0, pagados: 0, pendientes: 0, enRevision: 0, vencidos: 0, montoPendiente: 0 }
  for (const p of periodos) {
    resumen.total += 1
    const situacion = situacionPeriodo(p, hoyIso)
    if (situacion === 'pagado') {
      resumen.pagados += 1
      continue
    }
    resumen.pendientes += 1
    resumen.montoPendiente += Number(p.monto) || 0
    if (situacion === 'en_revision') resumen.enRevision += 1
    if (situacion === 'vencido') resumen.vencidos += 1
  }
  return resumen
}

/**
 * Estado de pago del alquiler (para el listado y su filtro):
 *   revisar   → hay comprobantes esperando que el Encargado confirme el pago.
 *   deuda     → hay períodos vencidos sin comprobante.
 *   pendiente → hay períodos pendientes todavía en plazo.
 *   al_dia    → todos los períodos están pagados.
 */
export function estadoPagoAlquiler(resumen) {
  if (resumen.enRevision > 0) return 'revisar'
  if (resumen.vencidos > 0) return 'deuda'
  if (resumen.pendientes > 0) return 'pendiente'
  return 'al_dia'
}

export const ESTADO_PAGO_ALQUILER = {
  revisar: { label: 'Comprobante por revisar', tone: 'brand' },
  deuda: { label: 'Con períodos vencidos', tone: 'danger' },
  pendiente: { label: 'Pago del mes pendiente', tone: 'warning' },
  al_dia: { label: 'Al día', tone: 'success' },
}

/** Estado del comprobante: lo da su período (el pago se confirma por período, no por comprobante). */
export function estadoComprobante(periodo) {
  return periodo?.estado === 'Pagado'
    ? { label: 'Pago confirmado', tone: 'success' }
    : { label: 'En revisión', tone: 'brand' }
}

/**
 * Qué se puede hacer con un período según el rol. Para el Encargado, confirmar el pago exige un
 * comprobante y que no falte confirmar el aumento de ese mes (`aumentoPendiente`).
 */
export function accionesPeriodo(periodo, { rol, contratoActivo, aumentoPendiente = null }) {
  const pendiente = periodo?.estado === 'Pendiente'
  const conComprobante = cantidadComprobantes(periodo) > 0
  if (rol === 'encargado') {
    return {
      registrarComprobante: pendiente,
      confirmarPago: pendiente && conComprobante && !aumentoPendiente,
      deshacerPago: periodo?.estado === 'Pagado',
    }
  }
  if (rol === 'inquilino') {
    return { registrarComprobante: pendiente && Boolean(contratoActivo), confirmarPago: false, deshacerPago: false }
  }
  return { registrarComprobante: false, confirmarPago: false, deshacerPago: false }
}

/** Etiqueta corta de la situación, para las tablas. */
export const SITUACION_CORTA = {
  pagado: 'Pagado',
  en_revision: 'En revisión',
  vencido: 'Vencido',
  pendiente: 'Pendiente',
}

/**
 * Mes del aumento que falta confirmar y que afecta al período (RF-057), o null. Un período no
 * se puede dar por pagado mientras el monto de ese mes depende de un aumento sin confirmar.
 */
export function aumentoPendienteDelPeriodo(periodo, contrato) {
  if (!periodo || contrato?.estado !== 'activo') return null
  const proximo = contrato.fecha_proximo_aumento
  if (!proximo || (contrato.fecha_fin && proximo > contrato.fecha_fin)) return null
  const mesAumento = `${proximo.slice(0, 7)}-01`
  return mesAumento <= periodo.periodo ? mesAumento : null
}

/** Días que cubre el período: del 1 al último día del mes, recortado por el inicio y el fin del contrato. */
export function rangoPeriodo(periodo, contrato) {
  if (!periodo?.periodo) return null
  const [anio, mes] = periodo.periodo.split('-').map(Number)
  const ultimo = new Date(anio, mes, 0).getDate()
  const finMes = `${periodo.periodo.slice(0, 8)}${String(ultimo).padStart(2, '0')}`
  const desde = contrato?.fecha_inicio && contrato.fecha_inicio > periodo.periodo ? contrato.fecha_inicio : periodo.periodo
  const hasta = contrato?.fecha_fin && contrato.fecha_fin < finMes ? contrato.fecha_fin : finMes
  return { desde, hasta }
}

/** Orden del listado mensual: primero lo que requiere atención. */
const ORDEN_SITUACION = { vencido: 0, en_revision: 1, pendiente: 2, pagado: 3 }
export const ordenSituacion = (situacion) => ORDEN_SITUACION[situacion] ?? 9
