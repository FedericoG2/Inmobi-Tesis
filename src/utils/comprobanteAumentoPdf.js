import { jsPDF } from 'jspdf'
import { detalleCalculoAumento, formatPeriodoIpc } from './aumentosUi'

const COLOR_TEXTO = [30, 41, 59] // slate-800
const COLOR_SUAVE = [100, 116, 139] // slate-500
const COLOR_LINEA = [226, 232, 240] // slate-200
const COLOR_ACENTO = [79, 70, 229] // indigo-600
const COLOR_AMBAR = [180, 83, 9] // amber-700

const fmtMoneda = (valor) =>
  valor == null
    ? '—'
    : new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0,
      }).format(Number(valor))

const fmtPct = (valor) =>
  valor == null ? '—' : `${Number(valor).toLocaleString('es-AR')}%`

const fmtFechaEmision = (fecha) => {
  const d = fecha instanceof Date ? fecha : new Date(fecha)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()} ${hh}:${min}`
}

const tipoAjusteLabel = {
  icl: 'ICL (Índice Casa Propia)',
  ipc: 'IPC (Nivel General)',
  porcentaje_fijo: 'Porcentaje fijo',
  manual: 'Manual',
}

/** Nombre de archivo del comprobante (incluye el período del aumento). */
export function nombreComprobanteAumento(propuesta) {
  const fecha = propuesta.fecha_hasta ?? propuesta.fecha_proximo_aumento
  const periodo = fecha ? fecha.slice(0, 7) : 'periodo'
  return `Comprobante-aumento-${periodo}.pdf`
}

/**
 * Genera un comprobante PDF del cálculo del aumento.
 * @returns {{ blob: Blob, filename: string }}
 */
export function generarComprobanteAumentoPdf(propuesta, opciones = {}) {
  const { fechaEmision = new Date(), inmobiliaria = 'INMOBI · Gestión Inmobiliaria' } = opciones
  const detalle = detalleCalculoAumento(propuesta)

  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const marginX = 48
  const contentW = pageW - marginX * 2
  let y = 56

  const setColor = (rgb) => doc.setTextColor(rgb[0], rgb[1], rgb[2])

  const sectionTitle = (texto) => {
    y += 10
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    setColor(COLOR_ACENTO)
    doc.text(texto.toUpperCase(), marginX, y)
    y += 6
    doc.setDrawColor(COLOR_LINEA[0], COLOR_LINEA[1], COLOR_LINEA[2])
    doc.setLineWidth(0.8)
    doc.line(marginX, y, marginX + contentW, y)
    y += 16
  }

  const filaDato = (label, valor, opts = {}) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    setColor(COLOR_SUAVE)
    doc.text(String(label), marginX, y)
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
    setColor(opts.color ?? COLOR_TEXTO)
    if (opts.size) doc.setFontSize(opts.size)
    doc.text(String(valor ?? '—'), marginX + contentW, y, { align: 'right' })
    y += opts.gap ?? 18
  }

  // ----- Encabezado -----
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  setColor(COLOR_TEXTO)
  doc.text('Comprobante de Aumento de Alquiler', marginX, y)
  y += 18
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  setColor(COLOR_SUAVE)
  doc.text(inmobiliaria, marginX, y)
  doc.text(`Emitido el ${fmtFechaEmision(fechaEmision)}`, marginX + contentW, y, { align: 'right' })
  y += 8

  // ----- Datos del contrato -----
  sectionTitle('Datos')
  filaDato('Inquilino', propuesta.inquilino_nombre)
  filaDato('Propiedad', propuesta.propiedad_direccion)
  filaDato('Tipo de ajuste', tipoAjusteLabel[detalle.tipo] ?? detalle.tipo?.toUpperCase())
  filaDato(
    'Período considerado',
    `${detalle.periodo.desdeLabel} a ${detalle.periodo.hastaLabel}`
  )
  filaDato('Vigencia del nuevo monto', `Desde el ${detalle.periodo.hastaLabel}`)

  // ----- Resultado -----
  sectionTitle('Resultado')
  filaDato('Monto anterior', fmtMoneda(propuesta.monto_actual))
  filaDato('Variación aplicada', fmtPct(propuesta.variacion_pct))
  filaDato('Nuevo monto', `${detalle.esAproximado ? '~ ' : ''}${fmtMoneda(propuesta.monto_propuesto)}`, {
    bold: true,
    size: 13,
    color: COLOR_ACENTO,
    gap: 22,
  })

  // ----- Cómo se calculó -----
  sectionTitle('Cómo se calculó')
  if (detalle.filasIndice.length > 0) {
    detalle.filasIndice.forEach((fila) => filaDato(fila.label, fila.value))
  }

  if (detalle.formula) {
    y += 2
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9.5)
    setColor(COLOR_TEXTO)
    const lineas = doc.splitTextToSize(detalle.formula, contentW)
    doc.text(lineas, marginX, y)
    y += lineas.length * 13 + 4
  }

  // Tabla mes a mes (IPC)
  if (detalle.tipo === 'ipc' && Array.isArray(detalle.ipcDetalle) && detalle.ipcDetalle.length > 0) {
    y += 8
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    setColor(COLOR_SUAVE)
    doc.text('Mes', marginX, y)
    doc.text('Variación IPC', marginX + 160, y)
    doc.text('Estado', marginX + contentW, y, { align: 'right' })
    y += 6
    doc.setDrawColor(COLOR_LINEA[0], COLOR_LINEA[1], COLOR_LINEA[2])
    doc.setLineWidth(0.5)
    doc.line(marginX, y, marginX + contentW, y)
    y += 14

    doc.setFont('helvetica', 'normal')
    setColor(COLOR_TEXTO)
    detalle.ipcDetalle.forEach((mes) => {
      const label = formatPeriodoIpc(Number(mes.anio), Number(mes.mes))
      doc.text(label, marginX, y)
      doc.text(mes.variacion_pct != null ? fmtPct(mes.variacion_pct) : '—', marginX + 160, y)
      setColor(mes.publicado ? COLOR_TEXTO : COLOR_AMBAR)
      doc.text(mes.publicado ? 'Publicado' : 'Estimado', marginX + contentW, y, { align: 'right' })
      setColor(COLOR_TEXTO)
      y += 15
    })
    y += 4
  }

  // ----- Aviso de valor aproximado -----
  if (detalle.advertencia) {
    y += 6
    doc.setFillColor(254, 243, 199) // amber-100
    const texto = detalle.advertencia.texto
    const lineas = doc.splitTextToSize(texto, contentW - 24)
    const boxH = lineas.length * 12 + 20
    doc.roundedRect(marginX, y, contentW, boxH, 6, 6, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    setColor(COLOR_AMBAR)
    doc.text('Valor provisorio', marginX + 12, y + 16)
    doc.setFont('helvetica', 'normal')
    setColor(COLOR_TEXTO)
    doc.text(lineas, marginX + 12, y + 30)
    y += boxH + 10
  }

  // ----- Pie -----
  const footerY = doc.internal.pageSize.getHeight() - 40
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  setColor(COLOR_SUAVE)
  const pie = doc.splitTextToSize(
    'Comprobante generado automáticamente a partir de los índices oficiales utilizados en el cálculo. Documento informativo del ajuste; no constituye factura ni recibo de pago.',
    contentW
  )
  doc.text(pie, marginX, footerY)

  return { blob: doc.output('blob'), filename: nombreComprobanteAumento(propuesta) }
}
