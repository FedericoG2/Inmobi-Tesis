import { hoyIsoLocal } from './contratoVigencia'

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

function claveMes(year, month) {
  return year * 100 + month
}

function parseClaveMes(iso) {
  if (!iso) return null
  const [year, month] = iso.split('-').map(Number)
  if (!year || !month) return null
  return claveMes(year, month)
}

function ultimoDiaMesIso(year, month) {
  const fin = new Date(year, month, 0)
  const dd = String(fin.getDate()).padStart(2, '0')
  const mm = String(month).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

function montoVigenteAlCierreMes(contrato, year, month, aumentosOrdenados) {
  const fechaCorte = ultimoDiaMesIso(year, month)
  let monto = Number(contrato.monto_inicial ?? contrato.monto_alquiler ?? 0)

  for (const aumento of aumentosOrdenados) {
    if (aumento.fecha_aplicacion <= fechaCorte) {
      monto = Number(aumento.monto_nuevo)
    }
  }

  return monto
}

function listarMesesEntre(inicioIso, finIso) {
  const inicio = parseClaveMes(inicioIso)
  const fin = parseClaveMes(finIso)
  if (inicio == null || fin == null || fin < inicio) return []

  const meses = []
  let year = Math.floor(inicio / 100)
  let month = inicio % 100

  while (claveMes(year, month) <= fin) {
    meses.push({ year, month })
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }

  return meses
}

/** Listado mes a mes del alquiler vigente en cada mes del contrato. */
export function armarHistorialMontosContrato(contrato, hoy = hoyIsoLocal()) {
  if (!contrato?.fecha_inicio) return []

  const finContrato = contrato.fecha_fin ?? hoy
  const finListado = finContrato < hoy ? finContrato : hoy

  const meses = listarMesesEntre(contrato.fecha_inicio, finListado)
  if (meses.length === 0) return []

  const aumentos = [...(contrato.aumentos ?? [])].sort((a, b) =>
    (a.fecha_aplicacion ?? '').localeCompare(b.fecha_aplicacion ?? '')
  )

  const hoyClave = parseClaveMes(hoy)
  let montoAnterior = null

  return meses.map(({ year, month }) => {
    const monto = montoVigenteAlCierreMes(contrato, year, month, aumentos)
    const esMesActual = claveMes(year, month) === hoyClave
    const huboAumento = montoAnterior != null && monto !== montoAnterior
    const fila = {
      id: `${year}-${String(month).padStart(2, '0')}`,
      year,
      month,
      mesLabel: `${MESES[month - 1]} ${year}`,
      monto,
      montoAnterior: huboAumento ? montoAnterior : null,
      esMesActual,
      huboAumento,
    }
    montoAnterior = monto
    return fila
  })
}
