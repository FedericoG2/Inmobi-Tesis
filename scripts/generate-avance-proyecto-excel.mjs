import ExcelJS from 'exceljs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outputPath = join(__dirname, '..', 'docs', 'Avance_Proyecto_CU_Criticos.xlsx')

/**
 * Puntos por etapa (máx. Análisis 20 + Diseño 25 + Implementación 50 + Validación 5 = 100).
 * Criterios transversales:
 * - Análisis: 20 (CU modelados y acordados).
 * - Diseño: 22/25 — falta vista mobile en admin.
 * - Validación: 0/5 — hay pruebas internas; sin validación usuario final/docente (no cuenta el 5%).
 */
const CU_AVANCE = [
  {
    id: 'CU-CT001',
    modulo: 'Contratos',
    nombre: 'Registrar Contrato',
    analisis: 20,
    diseno: 22,
    implementacion: 22,
    validacion: 0,
    complejidad: 5,
  },
  {
    id: 'CU-CT008',
    modulo: 'Contratos',
    nombre: 'Consultar Cronograma e Historial de Aumentos',
    analisis: 20,
    diseno: 22,
    implementacion: 30,
    validacion: 0,
    complejidad: 3,
  },
  {
    id: 'CU-CT004',
    modulo: 'Contratos',
    nombre: 'Finalizar Contrato Anticipadamente',
    analisis: 20,
    diseno: 22,
    implementacion: 32,
    validacion: 0,
    complejidad: 3,
  },
  {
    id: 'CU-AU001',
    modulo: 'Aumentos',
    nombre: 'Sincronizar Índices Oficiales',
    analisis: 20,
    diseno: 22,
    implementacion: 34,
    validacion: 0,
    complejidad: 5,
  },
  {
    id: 'CU-AU004',
    modulo: 'Aumentos',
    nombre: 'Revisar Detalle de Cálculo de Aumento',
    analisis: 20,
    diseno: 22,
    implementacion: 40,
    validacion: 0,
    complejidad: 8,
  },
  {
    id: 'CU-AU005',
    modulo: 'Aumentos',
    nombre: 'Confirmar Aumento Definitivo',
    analisis: 20,
    diseno: 22,
    implementacion: 36,
    validacion: 0,
    complejidad: 5,
  },
  {
    id: 'CU-PR001',
    modulo: 'Propiedades',
    nombre: 'Registrar Nueva Propiedad',
    analisis: 20,
    diseno: 22,
    implementacion: 38,
    validacion: 0,
    complejidad: 3,
  },
  {
    id: 'CU-IN001',
    modulo: 'Inquilinos',
    nombre: 'Registrar Nuevo Inquilino',
    analisis: 20,
    diseno: 22,
    implementacion: 38,
    validacion: 0,
    complejidad: 3,
  },
]

const PENDIENTES = [
  // ── CU-CT001 ──
  {
    cu: 'CU-CT001',
    titulo: 'Edición acotada post-alta',
    descripcion:
      'No existe flujo para corregir fechas de vigencia, índice (ICL/IPC), periodicidad o monto inicial después del alta, respetando reglas cuando ya hay aumentos confirmados.',
  },
  {
    cu: 'CU-CT001',
    titulo: 'Número de contrato legible',
    descripcion:
      'Falta identificador comercial (ej. 2026-0001) en listado, detalle y búsqueda. Hoy solo se muestra el id interno de Supabase.',
  },
  {
    cu: 'CU-CT001',
    titulo: 'Revalidar propiedad disponible al guardar',
    descripcion:
      'Al confirmar el alta no se vuelve a consultar si la propiedad sigue Disponible (sin contrato activo/programado). Riesgo de doble asignación si otro usuario alta en paralelo.',
  },
  {
    cu: 'CU-CT001',
    titulo: 'Alta inline de inquilino / propiedad',
    descripcion:
      'Desde el wizard de contrato no se puede crear inquilino ni propiedad nueva; hay que salir al módulo correspondiente y volver.',
  },
  {
    cu: 'CU-CT001',
    titulo: 'Abrir detalle del contrato recién creado',
    descripcion:
      'Tras el alta exitosa no hay redirección ni apertura automática del detalle/cronograma para revisar lo cargado.',
  },
  {
    cu: 'CU-CT001',
    titulo: 'Garantes (fuera de alcance acordado)',
    descripcion:
      'Modelo y UI de garantes no implementados. Queda explícitamente fuera del sprint actual pero es gap funcional del CU completo.',
  },
  {
    cu: 'CU-CT001',
    titulo: 'Validación usuario final (5%)',
    descripcion:
      'Pruebas internas del wizard OK. Falta sesión de validación formal con administrador/docente sobre el flujo completo de alta.',
  },
  {
    cu: 'CU-CT001',
    titulo: 'Vista mobile — diseño (3 pts)',
    descripcion:
      'Wizard de 4 pasos, selects y resumen no adaptados a pantallas chicas; usable solo en desktop/tablet horizontal.',
  },
  // ── CU-CT008 ──
  {
    cu: 'CU-CT008',
    titulo: 'Refresh del cronograma en vivo',
    descripcion:
      'Si el detalle del contrato está abierto y se confirma un aumento en otro módulo, la fila no pasa de Pendiente → Aplicado hasta cerrar y reabrir el modal.',
  },
  {
    cu: 'CU-CT008',
    titulo: 'Cronograma en contrato finalizado',
    descripcion:
      'Historial y cronograma post-finalización no tienen comportamiento unificado (solo lectura vs ocultar vs marcar cortado).',
  },
  {
    cu: 'CU-CT008',
    titulo: 'Exportar / imprimir cronograma',
    descripcion:
      'No hay export PDF ni vista de impresión del cronograma e historial para entregar al inquilino o archivo.',
  },
  {
    cu: 'CU-CT008',
    titulo: 'Validación usuario final (5%)',
    descripcion:
      'Cronograma unificado probado internamente. Falta cierre con administrador sobre lectura de estados y fechas.',
  },
  {
    cu: 'CU-CT008',
    titulo: 'Vista mobile — diseño (3 pts)',
    descripcion:
      'Tabla de cronograma en detalle de contrato con muchas columnas; no hay layout mobile (cards o scroll optimizado).',
  },
  // ── CU-CT004 ──
  {
    cu: 'CU-CT004',
    titulo: 'Semántica rescisión anticipada',
    descripcion:
      'Finalizar detiene aumentos y libera propiedad, pero no registra motivo, fecha de corte distinta a “hoy” ni diferencia rescisión anticipada de fin de vigencia natural.',
  },
  {
    cu: 'CU-CT004',
    titulo: 'Auditoría / trazabilidad',
    descripcion:
      'No queda registro explícito en historial del contrato de quién finalizó, cuándo y con qué advertencias aceptadas.',
  },
  {
    cu: 'CU-CT004',
    titulo: 'Efecto en aumentos pendientes',
    descripcion:
      'Falta documentar y validar en UI qué ocurre con aumentos en estado pendiente al finalizar (cancelar vs mantener histórico).',
  },
  {
    cu: 'CU-CT004',
    titulo: 'Validación usuario final (5%)',
    descripcion:
      'Modal de advertencia y acción desde listado/detalle implementados. Falta validar flujo con administrador real.',
  },
  {
    cu: 'CU-CT004',
    titulo: 'Vista mobile — diseño (3 pts)',
    descripcion:
      'Botón y confirmación de finalizar sin layout mobile dedicado en listado y ficha de contrato.',
  },
  // ── CU-AU001 ──
  {
    cu: 'CU-AU001',
    titulo: 'Edge Function Argly en producción',
    descripcion:
      'Código de sync ICL/IPC contra Argly existe; falta verificar despliegue estable, secrets y monitoreo en entorno productivo.',
  },
  {
    cu: 'CU-AU001',
    titulo: 'Programación / cron confiable',
    descripcion:
      'Sincronización automática periódica (pg_cron o job externo) sin alertas visibles al admin si falla la corrida.',
  },
  {
    cu: 'CU-AU001',
    titulo: 'Manejo de errores en UI',
    descripcion:
      'Ante timeout o API caída, el módulo no muestra estado claro (última sync OK, reintentar manual) al administrador.',
  },
  {
    cu: 'CU-AU001',
    titulo: 'Validación usuario final (5%)',
    descripcion:
      'Sync probada en desarrollo. Falta validación con índices reales y criterio de aceptación con administrador.',
  },
  {
    cu: 'CU-AU001',
    titulo: 'Vista mobile — diseño (3 pts)',
    descripcion:
      'Pantalla de índices y botón sincronizar sin adaptación mobile.',
  },
  // ── CU-AU004 (complejidad 8 — cálculo / auditoría matemática) ──
  {
    cu: 'CU-AU004',
    titulo: 'Motor de cálculo en panel (implícito en consulta)',
    descripcion:
      'El RPC calcular_aumentos_pendientes (ICL/IPC) alimenta la grilla al ingresar al módulo; no es CU aparte pero es prerequisito del detalle que se audita acá.',
  },
  {
    cu: 'CU-AU004',
    titulo: 'Comparativa entre períodos',
    descripcion:
      'Detalle paso a paso del cálculo existe; falta vista comparativa índice anterior vs actual en contratos con muchos aumentos.',
  },
  {
    cu: 'CU-AU004',
    titulo: 'Enlaces al contrato e inquilino',
    descripcion:
      'Desde el detalle de cálculo no siempre hay navegación directa al contrato y partes involucradas.',
  },
  {
    cu: 'CU-AU004',
    titulo: 'Validación usuario final (5%)',
    descripcion:
      'Cálculo ICL/IPC mostrado en pruebas internas. Pendiente auditoría numérica con administrador/docente.',
  },
  {
    cu: 'CU-AU004',
    titulo: 'Vista mobile — diseño (3 pts)',
    descripcion:
      'Modal de detalle de cálculo con tablas anchas; no responsive.',
  },
  // ── CU-AU005 ──
  {
    cu: 'CU-AU005',
    titulo: 'Portal del inquilino — visibilidad inmediata',
    descripcion:
      'Tras confirmar aumento, revisar que el portal del inquilino refleje el nuevo monto y próxima fecha sin recargar ni inconsistencias.',
  },
  {
    cu: 'CU-AU005',
    titulo: 'Confirmación masiva / lote',
    descripcion:
      'Solo confirmación individual; no hay flujo para confirmar varios aumentos pendientes del mismo período.',
  },
  {
    cu: 'CU-AU005',
    titulo: 'Reversión / anulación',
    descripcion:
      'No hay flujo para deshacer una confirmación errónea (solo corrección manual en BD).',
  },
  {
    cu: 'CU-AU005',
    titulo: 'Validación usuario final (5%)',
    descripcion:
      'Ciclo confirmar → actualizar monto → próxima fecha probado internamente. Falta validación con inquilino y admin.',
  },
  {
    cu: 'CU-AU005',
    titulo: 'Vista mobile — diseño (3 pts)',
    descripcion:
      'Listado y confirmación de aumentos en admin sin versión mobile.',
  },
  // ── CU-PR001 ──
  {
    cu: 'CU-PR001',
    titulo: 'Validación de dirección / geocoding',
    descripcion:
      'Campos de ubicación manuales; sin validación contra mapa ni normalización de dirección.',
  },
  {
    cu: 'CU-PR001',
    titulo: 'Fotos y documentos de propiedad',
    descripcion:
      'Alta de datos básicos OK; sin galería de imágenes ni adjuntos en el mismo flujo de registro.',
  },
  {
    cu: 'CU-PR001',
    titulo: 'Validación usuario final (5%)',
    descripcion:
      'ABM con propietario y estado Disponible/Ocupada probado internamente. Falta cierre con administrador.',
  },
  {
    cu: 'CU-PR001',
    titulo: 'Vista mobile — diseño (3 pts)',
    descripcion:
      'Formulario de alta/edición de propiedad sin layout mobile.',
  },
  // ── CU-IN001 ──
  {
    cu: 'CU-IN001',
    titulo: 'Documentación adjunta (DNI, contrato social)',
    descripcion:
      'Registro de datos personales/jurídicos sin carga de documentos escaneados en el alta.',
  },
  {
    cu: 'CU-IN001',
    titulo: 'Búsqueda por CUIT/DNI duplicado',
    descripcion:
      'Validación básica en formulario; sin alerta proactiva si ya existe inquilino con mismo documento.',
  },
  {
    cu: 'CU-IN001',
    titulo: 'Validación usuario final (5%)',
    descripcion:
      'Alta física/jurídica y bloqueo por contrato activo probados internamente. Falta validación formal.',
  },
  {
    cu: 'CU-IN001',
    titulo: 'Vista mobile — diseño (3 pts)',
    descripcion:
      'Formulario de inquilino sin adaptación a pantallas chicas.',
  },
]

const GREEN = 'FF548235'
const LIGHT_GREEN = 'FFE2EFDA'
const WHITE = 'FFFFFFFF'
const BORDER = { style: 'thin', color: { argb: 'FF000000' } }

function applyBorder(cell) {
  cell.border = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER }
}

function pctCell(cell, value) {
  cell.value = value / 100
  cell.numFmt = '0%'
}

const workbook = new ExcelJS.Workbook()
workbook.creator = 'front-inmobi'
workbook.created = new Date()

// ─── Hoja 1 ─────────────────────────────────────────────────────────────────
const ws = workbook.addWorksheet('Avance Proyecto', {
  views: [{ showGridLines: true }],
})

ws.mergeCells('A1:J1')
const title = ws.getCell('A1')
title.value = 'Avance Proyecto — Casos de Uso Críticos (front-inmobi)'
title.font = { bold: true, size: 14 }
title.alignment = { horizontal: 'center', vertical: 'middle' }
title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GREEN } }
ws.getRow(1).height = 28

ws.mergeCells('C2:F2')
;['A2', 'B2', 'C2', 'D2', 'E2', 'F2', 'G2', 'H2', 'I2', 'J2'].forEach((addr) => {
  const c = ws.getCell(addr)
  if (['C2', 'D2', 'E2', 'F2'].includes(addr)) {
    c.value = addr === 'C2' ? 'Etapas' : c.value
  }
  if (addr >= 'A2' && addr <= 'J2') {
    c.font = { bold: true, color: { argb: WHITE } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } }
    c.alignment = { horizontal: 'center', wrapText: true }
    applyBorder(c)
  }
})
ws.getCell('C2').value = 'Etapas'

const headers = [
  'CU Críticos',
  'Módulo',
  'Análisis (20%)',
  'Diseño (25%)',
  'Implementación (50%)',
  'Validación (5%)',
  '% Avance (sum Etapas)',
  'Complejidad',
  'Peso Relativo',
  '% Avance Real',
]
headers.forEach((h, i) => {
  const cell = ws.getCell(3, i + 1)
  cell.value = h
  cell.font = { bold: true, color: { argb: WHITE } }
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } }
  cell.alignment = { horizontal: 'center', wrapText: true }
  applyBorder(cell)
})

const startRow = 4
const lastDataRow = startRow + CU_AVANCE.length - 1
const totalRow = lastDataRow + 1

CU_AVANCE.forEach((cu, idx) => {
  const r = startRow + idx
  ws.getCell(r, 1).value = `${cu.id}: ${cu.nombre}`
  ws.getCell(r, 1).alignment = { wrapText: true }
  ws.getCell(r, 2).value = cu.modulo
  ws.getCell(r, 2).alignment = { horizontal: 'center' }

  pctCell(ws.getCell(r, 3), cu.analisis)
  pctCell(ws.getCell(r, 4), cu.diseno)
  pctCell(ws.getCell(r, 5), cu.implementacion)
  pctCell(ws.getCell(r, 6), cu.validacion)

  ws.getCell(r, 7).value = { formula: `SUM(C${r}:F${r})` }
  ws.getCell(r, 7).numFmt = '0%'

  ws.getCell(r, 8).value = cu.complejidad
  ws.getCell(r, 8).alignment = { horizontal: 'center' }

  ws.getCell(r, 9).value = { formula: `H${r}/$H$${totalRow}` }
  ws.getCell(r, 9).numFmt = '0.00'

  ws.getCell(r, 10).value = { formula: `G${r}*I${r}` }
  ws.getCell(r, 10).numFmt = '0.00'

  for (let c = 1; c <= 10; c += 1) {
    applyBorder(ws.getCell(r, c))
    if (c >= 3 && c <= 6) ws.getCell(r, c).alignment = { horizontal: 'center' }
  }
})

ws.getCell(totalRow, 7).value = ''
ws.getCell(totalRow, 8).value = { formula: `SUM(H${startRow}:H${lastDataRow})` }
ws.getCell(totalRow, 8).font = { bold: true }
ws.getCell(totalRow, 9).value = { formula: `SUM(I${startRow}:I${lastDataRow})` }
ws.getCell(totalRow, 9).numFmt = '0.00'
ws.getCell(totalRow, 9).font = { bold: true }
applyBorder(ws.getCell(totalRow, 8))
applyBorder(ws.getCell(totalRow, 9))

const summaryRow = totalRow + 2
ws.mergeCells(`I${summaryRow}:J${summaryRow}`)
ws.getCell(`I${summaryRow}`).value = '% Avance Proyecto'
ws.getCell(`I${summaryRow}`).font = { bold: true, color: { argb: WHITE } }
ws.getCell(`I${summaryRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } }
ws.getCell(`I${summaryRow}`).alignment = { horizontal: 'right', vertical: 'middle' }
applyBorder(ws.getCell(`I${summaryRow}`))

// Total en columna J usando SUM de avance real — poner label en I y valor en J
ws.unMergeCells(`I${summaryRow}:J${summaryRow}`)
ws.getCell(`I${summaryRow}`).value = '% Avance Proyecto'
ws.getCell(`I${summaryRow}`).font = { bold: true, color: { argb: WHITE } }
ws.getCell(`I${summaryRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } }
ws.getCell(`I${summaryRow}`).alignment = { horizontal: 'right', vertical: 'middle' }
applyBorder(ws.getCell(`I${summaryRow}`))

ws.getCell(`J${summaryRow}`).value = { formula: `SUM(J${startRow}:J${lastDataRow})` }
ws.getCell(`J${summaryRow}`).numFmt = '0.00%'
ws.getCell(`J${summaryRow}`).font = { bold: true, color: { argb: WHITE } }
ws.getCell(`J${summaryRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } }
ws.getCell(`J${summaryRow}`).alignment = { horizontal: 'center' }
applyBorder(ws.getCell(`J${summaryRow}`))

ws.getColumn(1).width = 48
ws.getColumn(2).width = 12
for (let c = 3; c <= 10; c += 1) ws.getColumn(c).width = 14
ws.getColumn(7).width = 20

const legendRow = summaryRow + 3
ws.mergeCells(`A${legendRow}:J${legendRow}`)
ws.getCell(`A${legendRow}`).value = 'Notas de estimación (jun 2026)'
ws.getCell(`A${legendRow}`).font = { bold: true }

const legend = [
  'Análisis 20%: todos los CU críticos modelados y validados a nivel funcional.',
  'Diseño 22/25: diseño desktop implementado; único gap transversal = vista mobile admin.',
  'Implementación: proporcional a gaps técnicos reales por CU (código en front-inmobi + Supabase).',
  'Validación 0/5: hay pruebas internas; el 5% se cuenta solo con validación usuario final / docente (pendiente en todos los CU).',
  'Complejidad según escala 1–8 (hoja Criterios; en este proyecto se usan niveles 3, 5 y 8). AU004 = nivel 8 (auditoría del cálculo ICL/IPC). % Avance Proyecto = Σ (% Avance CU × Peso Relativo).',
]
legend.forEach((line, i) => {
  ws.mergeCells(`A${legendRow + 1 + i}:J${legendRow + 1 + i}`)
  ws.getCell(`A${legendRow + 1 + i}`).value = line
  ws.getCell(`A${legendRow + 1 + i}`).alignment = { wrapText: true }
})

// ─── Hoja 2 ─────────────────────────────────────────────────────────────────
const ws2 = workbook.addWorksheet('Pendientes por CU', {
  views: [{ state: 'frozen', ySplit: 1 }],
})

ws2.columns = [
  { header: 'CU Crítico', key: 'cu', width: 14 },
  { header: 'Ítem pendiente / mejora', key: 'titulo', width: 36 },
  { header: 'Descripción breve', key: 'descripcion', width: 78 },
]

const headerRow = ws2.getRow(1)
headerRow.font = { bold: true, color: { argb: WHITE } }
headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } }
headerRow.alignment = { horizontal: 'center', wrapText: true }
headerRow.height = 22
headerRow.eachCell(applyBorder)

PENDIENTES.forEach((p) => {
  const row = ws2.addRow(p)
  row.alignment = { vertical: 'top', wrapText: true }
  row.eachCell(applyBorder)
})

// ─── Hoja 3 ─────────────────────────────────────────────────────────────────
const ws3 = workbook.addWorksheet('Criterios', {})

ws3.getCell('A1').value = 'Etapas / Estado del CU'
ws3.getCell('B1').value = 'Descripción'
;['A1', 'B1'].forEach((a) => {
  ws3.getCell(a).font = { bold: true }
})

;[
  ['Análisis completado', 'Caso de uso modelado y validado'],
  ['Diseño completado', 'Clases, secuencia, BD definidas (+ UI; mobile pendiente en este proyecto)'],
  ['Implementado', 'Código funcional y probado'],
  ['Validado (pruebas exitosas)', 'CU completo y validado con usuario/docente'],
].forEach(([a, b], i) => {
  ws3.getCell(`A${2 + i}`).value = a
  ws3.getCell(`B${2 + i}`).value = b
})

ws3.getCell('A7').value = 'Nivel'
ws3.getCell('B7').value = 'Descripción'
ws3.getCell('C7').value = 'Ejemplo'
;['A7', 'B7', 'C7'].forEach((a) => {
  ws3.getCell(a).font = { bold: true }
})

;[
  [1, 'Muy simple (consulta, ABM básico)', 'Consultar stock'],
  [2, 'Simple con lógica media', 'Registrar proveedor'],
  [3, 'Moderada', 'Emitir cotización'],
  [5, 'Compleja', 'Procesar pedido y actualizar stock'],
  [8, 'Muy compleja / crítica', 'Generar factura con integración externa'],
].forEach(([nivel, desc, ej], i) => {
  ws3.getCell(`A${8 + i}`).value = nivel
  ws3.getCell(`B${8 + i}`).value = desc
  ws3.getCell(`C${8 + i}`).value = ej
})

ws3.getCell('A14').value = 'CU Críticos del proyecto'
ws3.getCell('A14').font = { bold: true }
const cuRef = [
  ['CU-CT001', 'Contratos', 'Registrar Contrato'],
  ['CU-CT008', 'Contratos', 'Consultar Cronograma e Historial de Aumentos'],
  ['CU-CT004', 'Contratos', 'Finalizar Contrato Anticipadamente'],
  ['CU-AU001', 'Aumentos', 'Sincronizar Índices Oficiales'],
  ['CU-AU004', 'Aumentos', 'Revisar Detalle de Cálculo de Aumento'],
  ['CU-AU005', 'Aumentos', 'Confirmar Aumento Definitivo'],
  ['CU-PR001', 'Propiedades', 'Registrar Nueva Propiedad'],
  ['CU-IN001', 'Inquilinos', 'Registrar Nuevo Inquilino'],
]
ws3.getCell('A15').value = 'ID'
ws3.getCell('B15').value = 'Módulo'
ws3.getCell('C15').value = 'Nombre'
;['A15', 'B15', 'C15'].forEach((a) => {
  ws3.getCell(a).font = { bold: true }
})
cuRef.forEach(([id, mod, nom], i) => {
  ws3.getCell(`A${16 + i}`).value = id
  ws3.getCell(`B${16 + i}`).value = mod
  ws3.getCell(`C${16 + i}`).value = nom
})

ws3.getColumn(1).width = 28
ws3.getColumn(2).width = 42
ws3.getColumn(3).width = 48

await workbook.xlsx.writeFile(outputPath)

const sumCompl = CU_AVANCE.reduce((s, c) => s + c.complejidad, 0)
const avanceProyecto = CU_AVANCE.reduce((s, c) => {
  const sumEtapas = (c.analisis + c.diseno + c.implementacion + c.validacion) / 100
  return s + sumEtapas * (c.complejidad / sumCompl)
}, 0)

console.log(`Excel generado: ${outputPath}`)
console.log(`% Avance Proyecto: ${(avanceProyecto * 100).toFixed(2)}%`)
