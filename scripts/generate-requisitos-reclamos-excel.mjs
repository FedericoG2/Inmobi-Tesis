import ExcelJS from 'exceljs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outputPath = join(__dirname, '..', 'docs', 'Requisitos_Modulo_Reclamos.xlsx')

const REQUISITOS_FUNCIONALES = [
  {
    id: 'RF-R01',
    descripcion:
      'El administrador debe poder consultar el listado completo de reclamos con inquilino, propiedad, categoría, fecha, prioridad y estado.',
    tipo: 'RF',
  },
  {
    id: 'RF-R02',
    descripcion:
      'El administrador debe poder buscar reclamos por inquilino, propiedad o título, y filtrar por estado, prioridad y categoría.',
    tipo: 'RF',
  },
  {
    id: 'RF-R03',
    descripcion:
      'El administrador debe poder registrar un nuevo reclamo asociado a un inquilino con contrato activo y a la propiedad correspondiente.',
    tipo: 'RF',
  },
  {
    id: 'RF-R04',
    descripcion:
      'El administrador debe poder editar un reclamo existente (título, descripción, categoría, prioridad y estado).',
    tipo: 'RF',
  },
  {
    id: 'RF-R05',
    descripcion:
      'El administrador debe poder eliminar un reclamo previa confirmación, con advertencia especial si ya estaba resuelto.',
    tipo: 'RF',
  },
  {
    id: 'RF-R06',
    descripcion:
      'El sistema debe alertar visualmente cuando existan reclamos con prioridad Urgente aún sin resolver.',
    tipo: 'RF',
  },
  {
    id: 'RF-R07',
    descripcion:
      'El inquilino debe poder crear un reclamo desde su portal, siempre que tenga un contrato activo.',
    tipo: 'RF',
  },
  {
    id: 'RF-R08',
    descripcion:
      'El inquilino debe poder consultar el listado de sus reclamos con estado y fecha de creación.',
    tipo: 'RF',
  },
  {
    id: 'RF-R09',
    descripcion:
      'El inquilino debe poder editar título y descripción de sus reclamos mientras estén en estado Pendiente.',
    tipo: 'RF',
  },
  {
    id: 'RF-R10',
    descripcion:
      'El inquilino debe poder eliminar sus reclamos en estado Pendiente, con confirmación previa.',
    tipo: 'RF',
  },
  {
    id: 'RF-R11',
    descripcion:
      'Al crear un reclamo, el sistema debe asociar automáticamente la propiedad del contrato activo del inquilino.',
    tipo: 'RF',
  },
  {
    id: 'RF-R12',
    descripcion:
      'El sistema debe validar que título y descripción sean obligatorios antes de guardar un reclamo.',
    tipo: 'RF',
  },
  {
    id: 'RF-R13',
    descripcion:
      'El sistema debe permitir clasificar cada reclamo en una categoría de mantenimiento (plomería, electricidad, albañilería, etc.).',
    tipo: 'RF',
  },
  {
    id: 'RF-R14',
    descripcion:
      'El sistema debe gestionar el ciclo de vida del reclamo mediante estados (Pendiente, En Proceso, Revisión, Resuelto, Rechazado).',
    tipo: 'RF',
  },
  {
    id: 'RF-R15',
    descripcion:
      'El administrador debe poder asignar y modificar la prioridad del reclamo (Baja, Media, Alta, Urgente).',
    tipo: 'RF',
  },
]

const REQUISITOS_NO_FUNCIONALES = [
  {
    id: 'RNF-R01',
    descripcion:
      'El módulo de gestión de reclamos del administrador debe ser accesible únicamente para usuarios con rol admin.',
    tipo: 'RNF',
  },
  {
    id: 'RNF-R02',
    descripcion:
      'El inquilino solo debe visualizar y operar sobre sus propios reclamos, según las políticas de seguridad de la base de datos.',
    tipo: 'RNF',
  },
  {
    id: 'RNF-R03',
    descripcion:
      'La interfaz debe adaptarse a distintos tamaños de pantalla en el panel admin y en el portal del inquilino.',
    tipo: 'RNF',
  },
  {
    id: 'RNF-R04',
    descripcion:
      'El sistema debe informar errores de carga, validación y acciones con mensajes claros al usuario.',
    tipo: 'RNF',
  },
  {
    id: 'RNF-R05',
    descripcion:
      'Las operaciones de eliminación deben requerir confirmación explícita para evitar borrados accidentales.',
    tipo: 'RNF',
  },
  {
    id: 'RNF-R06',
    descripcion:
      'El listado del administrador debe ordenarse cronológicamente, mostrando primero los reclamos más antiguos.',
    tipo: 'RNF',
  },
  {
    id: 'RNF-R07',
    descripcion:
      'El diseño del módulo debe mantener consistencia visual con el resto del panel administrativo.',
    tipo: 'RNF',
  },
  {
    id: 'RNF-R08',
    descripcion:
      'Los reclamos urgentes deben integrarse con el dashboard administrativo para su seguimiento operativo.',
    tipo: 'RNF',
  },
  {
    id: 'RNF-R09',
    descripcion:
      'Las restricciones de edición y eliminación del inquilino deben aplicarse tanto en la interfaz como en el servidor.',
    tipo: 'RNF',
  },
  {
    id: 'RNF-R10',
    descripcion:
      'El alta de reclamos debe impedirse cuando el inquilino no posee contrato activo vigente.',
    tipo: 'RNF',
  },
]

const GREEN = 'FF548235'
const WHITE = 'FFFFFFFF'
const BORDER = { style: 'thin', color: { argb: 'FF000000' } }

function applyBorder(cell) {
  cell.border = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER }
}

function crearHoja(workbook, nombreHoja, filas) {
  const ws = workbook.addWorksheet(nombreHoja, {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  ws.columns = [
    { header: 'ID Requerimiento', key: 'id', width: 18 },
    { header: 'Descripción', key: 'descripcion', width: 88 },
    { header: 'Tipo', key: 'tipo', width: 10 },
  ]

  const headerRow = ws.getRow(1)
  headerRow.font = { bold: true, color: { argb: WHITE } }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } }
  headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  headerRow.height = 22
  headerRow.eachCell(applyBorder)

  filas.forEach((fila) => {
    const row = ws.addRow(fila)
    row.alignment = { vertical: 'top', wrapText: true }
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'top' }
    row.getCell(3).alignment = { horizontal: 'center', vertical: 'top' }
    row.eachCell(applyBorder)
  })

  return ws
}

const workbook = new ExcelJS.Workbook()
workbook.creator = 'front-inmobi'
workbook.created = new Date()

crearHoja(workbook, 'Requerimientos Funcionales', REQUISITOS_FUNCIONALES)
crearHoja(workbook, 'Requerimientos No Funcionales', REQUISITOS_NO_FUNCIONALES)

await workbook.xlsx.writeFile(outputPath)

console.log(`Excel generado: ${outputPath}`)
console.log(`RF: ${REQUISITOS_FUNCIONALES.length} | RNF: ${REQUISITOS_NO_FUNCIONALES.length}`)
