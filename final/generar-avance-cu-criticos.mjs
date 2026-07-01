import ExcelJS from 'exceljs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Contribución máxima por etapa (valores decimales → formato 0% en Excel) */
const PESO = { analisis: 0.2, diseno: 0.25, implementacion: 0.5, validacion: 0.05 }

/** 12 CU críticos — sección 3.4 documento Inmobi (orden PDF) */
const CU_CRITICOS = [
  { id: 'CU-017', nombre: 'Crear inquilino', modulo: 'Inquilinos', analisis: 100, diseno: 100, implementacion: 100, validacion: 0, complejidad: 2 },
  { id: 'CU-011', nombre: 'Crear propiedad', modulo: 'Propiedades', analisis: 100, diseno: 100, implementacion: 100, validacion: 0, complejidad: 2 },
  { id: 'CU-022', nombre: 'Registrar contrato', modulo: 'Contratos', analisis: 100, diseno: 100, implementacion: 80, validacion: 0, complejidad: 5 },
  { id: 'CU-028', nombre: 'Consultar inquilino', modulo: 'Contratos', analisis: 100, diseno: 100, implementacion: 80, validacion: 0, complejidad: 3 },
  { id: 'CU-029', nombre: 'Consultar propiedad disponible', modulo: 'Contratos', analisis: 100, diseno: 100, implementacion: 80, validacion: 0, complejidad: 3 },
  { id: 'CU-039', nombre: 'Actualizar índices y montos', modulo: 'Aumentos', analisis: 100, diseno: 100, implementacion: 80, validacion: 0, complejidad: 5 },
  { id: 'CU-032', nombre: 'Consultar detalle del cálculo', modulo: 'Aumentos', analisis: 100, diseno: 100, implementacion: 80, validacion: 0, complejidad: 3 },
  { id: 'CU-033', nombre: 'Confirmar aumento', modulo: 'Aumentos', analisis: 100, diseno: 100, implementacion: 70, validacion: 0, complejidad: 8 },
  { id: 'CU-040', nombre: 'Aplicar aumentos programados', modulo: 'Aumentos', analisis: 100, diseno: 60, implementacion: 40, validacion: 0, complejidad: 5 },
  { id: 'CU-034', nombre: 'Deshacer aumento', modulo: 'Aumentos', analisis: 100, diseno: 100, implementacion: 60, validacion: 0, complejidad: 5 },
  { id: 'CU-031', nombre: 'Visualizar aumentos a confirmar (seguimiento)', modulo: 'Aumentos', analisis: 100, diseno: 100, implementacion: 60, validacion: 0, complejidad: 3 },
  { id: 'CU-047', nombre: 'Gestionar reclamo (seguimiento)', modulo: 'Reclamos', analisis: 100, diseno: 100, implementacion: 80, validacion: 0, complejidad: 3 },
]

const JUSTIFICACIONES = {
  'CU-017': 'Dato base que habilita un contrato. Sin inquilino cargado no se inicia la cadena de valor.',
  'CU-011': 'Dato base imprescindible para un contrato. Del estado depende qué propiedades pueden contratarse.',
  'CU-022': 'Habilitador del negocio: sin contrato activo no hay aumentos ni comprobantes.',
  'CU-028': 'Include de Registrar contrato. Garantiza inquilino válido al armar el contrato.',
  'CU-029': 'Include de Registrar contrato. Garantiza propiedad disponible válida.',
  'CU-039': 'Todo el cálculo depende de índices IPC/ICL oficiales.',
  'CU-032': 'Control de calidad previo a confirmar: valida fórmula, período e índices.',
  'CU-033': 'Caso más crítico: materializa el aumento, snapshot inmutable y comprobante.',
  'CU-040': 'Proceso automático (pg_cron). Si falla, aumentos acordados no se aplican.',
  'CU-034': 'Red de seguridad ante error en confirmación; restaura monto y fechas.',
  'CU-031': 'Vista operativa: evita que aumentos del período queden sin gestionar.',
  'CU-047': 'Trazabilidad del seguimiento; valor diferencial de atención al inquilino.',
}

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } }
const SUMMARY_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } }

const BORDER = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
}

function etapa(pct, max) {
  return (pct / 100) * max
}

function avanceCu(cu) {
  return (
    etapa(cu.analisis, PESO.analisis) +
    etapa(cu.diseno, PESO.diseno) +
    etapa(cu.implementacion, PESO.implementacion) +
    etapa(cu.validacion, PESO.validacion)
  )
}

function styleCell(cell, opts = {}) {
  cell.border = BORDER
  cell.alignment = { vertical: 'middle', wrapText: true, ...opts.alignment }
  if (opts.fill) cell.fill = opts.fill
  if (opts.font) cell.font = opts.font
}

function styleHeader(cell) {
  styleCell(cell, {
    fill: HEADER_FILL,
    font: { bold: true },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
  })
}

async function main() {
  const sumCompl = CU_CRITICOS.reduce((a, c) => a + c.complejidad, 0)

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Inmobi - G1 Gonzalez/Favre/Gomez'
  wb.created = new Date()

  const ws = wb.addWorksheet('Avance', { views: [{ state: 'frozen', ySplit: 3 }] })

  // ── Título (igual modelo) ──
  ws.mergeCells('B1:D1')
  const title = ws.getCell('B1')
  title.value = 'Avance Proyecto (regularización)'
  title.font = { bold: true, size: 12 }
  title.alignment = { horizontal: 'center', vertical: 'middle' }
  title.fill = HEADER_FILL

  ws.mergeCells('B2:E2')
  const etapasBanner = ws.getCell('B2')
  etapasBanner.value = 'Etapas'
  etapasBanner.font = { bold: true }
  etapasBanner.alignment = { horizontal: 'center', vertical: 'middle' }
  etapasBanner.fill = HEADER_FILL

  // ── Encabezados fila 3 ──
  const headers = [
    'CU Críticos',
    'Analisis \n(20%)',
    'Diseño \n(25%)',
    'Implementación \n(50%)',
    'Validación \n(5%)',
    '% Avance (sum Etapas)',
    'Complejidad',
    'Peso Relativo (Sum total Complejidad / Complejidad ind.)',
    '% Avance Real',
  ]
  headers.forEach((h, i) => {
    const cell = ws.getRow(3).getCell(i + 1)
    cell.value = h
    styleHeader(cell)
  })
  ws.getRow(3).height = 40

  // ── Anchos ──
  ws.getColumn(1).width = 14
  ws.getColumn(2).width = 11
  ws.getColumn(3).width = 11
  ws.getColumn(4).width = 16
  ws.getColumn(5).width = 11
  ws.getColumn(6).width = 18
  ws.getColumn(7).width = 13
  ws.getColumn(8).width = 22
  ws.getColumn(9).width = 14

  const R1 = 4
  const RLast = R1 + CU_CRITICOS.length - 1
  const RTotal = RLast + 1
  const RSummary = RTotal + 2

  // ── Filas de datos ──
  CU_CRITICOS.forEach((cu, idx) => {
    const r = R1 + idx
    const row = ws.getRow(r)
    const fVal = avanceCu(cu)
    const hVal = cu.complejidad / sumCompl
    const iVal = fVal * hVal

    row.getCell(1).value = cu.id
    row.getCell(2).value = etapa(cu.analisis, PESO.analisis)
    row.getCell(3).value = etapa(cu.diseno, PESO.diseno)
    row.getCell(4).value = etapa(cu.implementacion, PESO.implementacion)
    row.getCell(5).value = etapa(cu.validacion, PESO.validacion)
    row.getCell(7).value = cu.complejidad

    row.getCell(6).value = { formula: `SUM(B${r}:E${r})`, result: fVal }
    row.getCell(8).value = { formula: `G${r}/G$${RTotal}`, result: hVal }
    row.getCell(9).value = { formula: `((F${r}/100)*H${r})*100`, result: iVal }

    for (let c = 1; c <= 9; c++) {
      styleCell(row.getCell(c), { alignment: { horizontal: 'center', vertical: 'middle' } })
    }

    row.getCell(2).numFmt = '0%'
    row.getCell(3).numFmt = '0%'
    row.getCell(4).numFmt = '0%'
    row.getCell(5).numFmt = '0%'
    row.getCell(6).numFmt = '0%'
    row.getCell(7).numFmt = '0'
    row.getCell(8).numFmt = '0.00'
    row.getCell(9).numFmt = '0.00'
  })

  // ── Fila totales ──
  const totalRow = ws.getRow(RTotal)
  totalRow.getCell(7).value = { formula: `SUM(G${R1}:G${RLast})`, result: sumCompl }
  totalRow.getCell(8).value = { formula: `SUM(H${R1}:H${RLast})`, result: 1 }
  totalRow.getCell(7).numFmt = '0'
  totalRow.getCell(8).numFmt = '0'
  totalRow.getCell(7).font = { bold: true }
  totalRow.getCell(8).font = { bold: true }
  styleCell(totalRow.getCell(7), { alignment: { horizontal: 'center' } })
  styleCell(totalRow.getCell(8), { alignment: { horizontal: 'center' } })

  // ── % Avance Proyecto ──
  const avanceTotal = CU_CRITICOS.reduce((acc, cu) => acc + avanceCu(cu) * (cu.complejidad / sumCompl), 0)

  const lblSummary = ws.getCell(`H${RSummary}`)
  lblSummary.value = '% Avance Proyecto'
  lblSummary.font = { bold: true }
  lblSummary.fill = SUMMARY_FILL
  lblSummary.alignment = { horizontal: 'right', vertical: 'middle' }
  styleCell(lblSummary)

  const valSummary = ws.getCell(`I${RSummary}`)
  valSummary.value = { formula: `SUM(I${R1}:I${RLast})`, result: avanceTotal }
  valSummary.numFmt = '0.00%'
  valSummary.font = { bold: true, size: 12 }
  valSummary.fill = SUMMARY_FILL
  valSummary.alignment = { horizontal: 'center', vertical: 'middle' }
  styleCell(valSummary)

  // ── Tablas de referencia a la derecha (desde fila 4, cols K-M) ──
  const cRef = 11 // K
  const rRef = 4

  ws.getCell(rRef, cRef).value = 'Etapas/Estado del CU'
  ws.getCell(rRef, cRef + 1).value = 'Descripción'
  styleHeader(ws.getCell(rRef, cRef))
  styleHeader(ws.getCell(rRef, cRef + 1))

  ;[
    ['Análisis completado', 'Caso de uso modelado y validado'],
    ['Diseño completado', 'Clases, secuencia, BD definidas'],
    ['Implementado', 'Código funcional y probado'],
    ['Validado (pruebas exitosas)', 'CU completo y validado con usuario/docente'],
  ].forEach(([a, b], i) => {
    ws.getCell(rRef + 1 + i, cRef).value = a
    ws.getCell(rRef + 1 + i, cRef + 1).value = b
    styleCell(ws.getCell(rRef + 1 + i, cRef))
    styleCell(ws.getCell(rRef + 1 + i, cRef + 1))
  })

  const rComp = rRef + 6
  ws.getCell(rComp, cRef).value = 'Complejidad'
  styleHeader(ws.getCell(rComp, cRef))
  ws.mergeCells(rComp, cRef, rComp, cRef + 2)
  ws.getCell(rComp, cRef).alignment = { horizontal: 'center' }

  ws.getCell(rComp + 1, cRef).value = 'Nivel'
  ws.getCell(rComp + 1, cRef + 1).value = 'Descripción'
  ws.getCell(rComp + 1, cRef + 2).value = 'Ejemplo'
  ;[cRef, cRef + 1, cRef + 2].forEach((c) => styleHeader(ws.getCell(rComp + 1, c)))

  ;[
    [1, 'Muy simple (consulta, ABM básico)', 'Consultar stock'],
    [2, 'Simple con lógica media', 'Registrar proveedor / inquilino / propiedad'],
    [3, 'Moderada', 'Emitir cotización'],
    [5, 'Compleja', 'Procesar pedido y actualizar stock'],
    [8, 'Muy compleja / crítica', 'Confirmar aumento con integración externa'],
  ].forEach(([n, d, e], i) => {
    ws.getCell(rComp + 2 + i, cRef).value = n
    ws.getCell(rComp + 2 + i, cRef + 1).value = d
    ws.getCell(rComp + 2 + i, cRef + 2).value = e
    ;[cRef, cRef + 1, cRef + 2].forEach((c) => styleCell(ws.getCell(rComp + 2 + i, c)))
  })

  ws.getColumn(cRef).width = 28
  ws.getColumn(cRef + 1).width = 34
  ws.getColumn(cRef + 2).width = 36

  // ── Hoja detalle CU críticos ──
  const wsDet = wb.addWorksheet('CU Críticos')
  wsDet.getColumn(1).width = 10
  wsDet.getColumn(2).width = 44
  wsDet.getColumn(3).width = 14
  wsDet.getColumn(4).width = 72

  const detHeaders = ['N° CU', 'Nombre del CU', 'Módulo', 'Por qué es crítico']
  detHeaders.forEach((h, i) => {
    const cell = wsDet.getRow(1).getCell(i + 1)
    cell.value = h
    styleHeader(cell)
  })

  CU_CRITICOS.forEach((cu, idx) => {
    const r = idx + 2
    wsDet.getRow(r).getCell(1).value = cu.id
    wsDet.getRow(r).getCell(2).value = cu.nombre
    wsDet.getRow(r).getCell(3).value = cu.modulo
    wsDet.getRow(r).getCell(4).value = JUSTIFICACIONES[cu.id] ?? ''
    for (let c = 1; c <= 4; c++) styleCell(wsDet.getRow(r).getCell(c))
  })

  // ── Guardar ──
  const outPath = path.join(__dirname, 'Avance_Proyecto_CU_Criticos_Inmobi.xlsx')
  const altPath = path.join(__dirname, 'Avance_Proyecto_CU_Criticos_Inmobi_nuevo.xlsx')

  try {
    await wb.xlsx.writeFile(outPath)
    console.log(`✓ Generado: ${outPath}`)
  } catch (err) {
    if (err.code === 'EBUSY') {
      await wb.xlsx.writeFile(altPath)
      console.log(`⚠ Archivo original abierto en Excel.`)
      console.log(`✓ Generado: ${altPath}`)
    } else {
      throw err
    }
  }

  console.log(`\nCU críticos: ${CU_CRITICOS.length}`)
  console.log(`Total complejidad: ${sumCompl}`)
  console.log(`% Avance Proyecto: ${(avanceTotal * 100).toFixed(2)}%`)
  console.log('\nDetalle:')
  CU_CRITICOS.forEach((cu) => {
    const f = avanceCu(cu)
    console.log(
      `  ${cu.id} [${cu.modulo}] → ${(f * 100).toFixed(0)}% avance CU | compl. ${cu.complejidad}`
    )
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
