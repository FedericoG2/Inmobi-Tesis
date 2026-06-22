import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
} from 'docx'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outputPath = join(__dirname, '..', 'docs', 'Reporte_Casos_Uso_Criticos.docx')

const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }
const borders = { top: border, bottom: border, left: border, right: border }

function cell(text, opts = {}) {
  return new TableCell({
    borders,
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.header ? { fill: 'E8E8E8', type: ShadingType.CLEAR } : undefined,
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: opts.header, size: opts.header ? 22 : 20 })],
      }),
    ],
  })
}

function row(cells) {
  return new TableRow({ children: cells })
}

function heading(text, level) {
  return new Paragraph({ text, heading: level, spacing: { before: 240, after: 120 } })
}

function bullet(text, boldPrefix) {
  const runs = []
  if (boldPrefix) {
    runs.push(new TextRun({ text: boldPrefix, bold: true, size: 20 }))
  }
  runs.push(new TextRun({ text, size: 20 }))
  return new Paragraph({ bullet: { level: 0 }, children: runs, spacing: { after: 60 } })
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, size: 20, bold: opts.bold, italics: opts.italics })],
  })
}

function codeBlock(lines) {
  return lines.map(
    (line) =>
      new Paragraph({
        spacing: { after: 0 },
        indent: { left: 360 },
        children: [new TextRun({ text: line, font: 'Consolas', size: 18 })],
      })
  )
}

const doc = new Document({
  creator: 'front-inmobi',
  title: 'Reporte de Casos de Uso Críticos',
  description: 'Mapeo de CUs críticos vs implementación en front-inmobi',
  sections: [
    {
      properties: {},
      children: [
        heading('Reporte de Casos de Uso Críticos — front-inmobi', HeadingLevel.TITLE),
        para('Mapeo entre casos de uso críticos y estado de implementación en el proyecto.', {
          italics: true,
        }),
        para(
          'Gracias por compartir los casos de uso críticos. Se revisó el proyecto front-inmobi y este es el mapeo entre lo que se describió y lo que está implementado hoy.'
        ),

        heading('Resumen ejecutivo', HeadingLevel.HEADING_1),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            row([cell('CU', { header: true, width: 15 }), cell('Caso de uso', { header: true, width: 55 }), cell('Estado', { header: true, width: 30 })]),
            row([cell('CU-PR001'), cell('Registrar propiedad'), cell('Implementado')]),
            row([cell('CU-IN001'), cell('Registrar inquilino'), cell('Implementado')]),
            row([cell('CU-CT001'), cell('Registrar contrato'), cell('Implementado')]),
            row([cell('CU-AU001'), cell('Sincronizar índices (Argly/ICL/IPC)'), cell('Implementado')]),
            row([cell('CU-AU004'), cell('Revisar detalle de cálculo'), cell('Implementado')]),
            row([cell('CU-AU005'), cell('Confirmar aumento definitivo'), cell('Implementado')]),
            row([cell('CU-CT008'), cell('Cronograma e historial de aumentos'), cell('Parcial')]),
            row([cell('CU-CT004'), cell('Finalizar contrato anticipadamente'), cell('Parcial')]),
          ],
        }),
        para(''),
        para(
          'El núcleo del negocio está bien armado: la cadena Propiedad → Inquilino → Contrato → Índices → Cálculo → Confirmación existe y tiene lógica real en Supabase (RPCs, triggers, Edge Function).'
        ),

        heading('Cadena de dependencias', HeadingLevel.HEADING_1),
        ...codeBlock([
          'Propietario → Propiedad (CU-PR001)',
          '                ↓',
          'Inquilino (CU-IN001)',
          '                ↓',
          'Contrato (CU-CT001) ← fechas, índice y periodicidad definen todo lo demás',
          '                ↓',
          'Sync Argly ICL/IPC (CU-AU001)',
          '                ↓',
          'Cálculo + detalle (CU-AU004) → Confirmación (CU-AU005)',
          '                ↓',
          'Historial / cronograma (CU-CT008)',
          '                ↓',
          'Finalización (CU-CT004) → libera la propiedad',
        ]),

        heading('Detalle por módulo', HeadingLevel.HEADING_1),

        heading('Propiedades — CU-PR001 (Implementado)', HeadingLevel.HEADING_2),
        bullet('Ruta: /admin/propiedades'),
        bullet('Alta en PropiedadFormModal.jsx → propiedadesService.crearPropiedad()'),
        bullet('Requiere propietario previo; valida ubicación única'),

        heading('Inquilinos — CU-IN001 (Implementado)', HeadingLevel.HEADING_2),
        bullet('Ruta: /admin/inquilinos'),
        bullet('Alta en InquilinoFormModal.jsx → inquilinosService.crearInquilino()'),
        bullet('Persona física/jurídica, DNI/CUIT único, contacto de emergencia'),

        heading('Contratos — CU-CT001 (Implementado)', HeadingLevel.HEADING_2),
        bullet('Ruta: /admin/contratos'),
        bullet(
          'Wizard de 5 pasos en ContratoFormModal.jsx: partes, vigencia, ajustes (ICL/IPC), documentos, resumen'
        ),
        bullet('Preview de calendario de aumentos al crear (calcularPreviewAumentos)'),
        bullet('Al guardar: insert en Supabase + sincroniza estado de la propiedad'),
        para(
          'Riesgo: si las fechas o el índice se cargan mal, el módulo de Aumentos calculará mal. El formulario tiene preview, pero no hay edición de contrato post-alta — solo alta, finalizar y anular.',
          { bold: false }
        ),

        heading('Aumentos — CU-AU001, AU004, AU005 (Implementado)', HeadingLevel.HEADING_2),
        para('CU-AU001 — Sync índices', { bold: true }),
        bullet('Al entrar a /admin/aumentos, useAumentos dispara sync automático'),
        bullet('Edge Function sync-argly-icl consulta Argly y persiste en tabla indices'),
        bullet('Botón manual "Actualizar" para re-sincronizar'),
        bullet(
          'Dependencia crítica: la Edge Function debe estar desplegada en Supabase; si falla, hay fallback con warning'
        ),
        para('CU-AU004 — Detalle de cálculo', { bold: true }),
        bullet('AumentoDetalleModal.jsx + detalleCalculoAumento() en aumentosUi.js'),
        bullet(
          'Muestra montos, índices, fórmula paso a paso, estado (definitivo/orientativo/sin índices)'
        ),
        para('CU-AU005 — Confirmar aumento', { bold: true }),
        bullet('Confirmación individual o masiva vía RPC confirmar_aumentos'),
        bullet(
          'Al confirmar actualiza: monto_alquiler, fecha_ultimo_aumento, fecha_proximo_aumento del contrato + registro en historial'
        ),
        bullet('Solo confirma propuestas con índices completos y período vencido'),

        heading('Contratos — CU-CT008 (Parcial)', HeadingLevel.HEADING_2),
        para('Lo que sí existe:', { bold: true }),
        bullet('Historial de aumentos confirmados en ContratoDetalleModal.jsx'),
        bullet('Fechas clave: fecha_proximo_aumento, fecha_ultimo_aumento'),
        para('Lo que falta:', { bold: true }),
        bullet(
          'Cronograma futuro completo en consulta de contrato existente (solo está en el alta)'
        ),
        bullet(
          'Bug detectado: en el detalle del contrato, la sección "Próximo aumento" probablemente no funciona porque se trata data como array cuando el RPC devuelve { propuestas: [...] }'
        ),
        para('Código afectado (ContratoDetalleModal.jsx, líneas 195-196):'),
        ...codeBlock([
          'const propuesta = (data ?? []).find((p) => Number(p.contrato_id) === Number(contrato.id))',
          'setPropuestaAumento(propuesta ?? null)',
        ]),
        para('En useAumentos.js sí se usa correctamente data?.propuestas.'),

        heading('Contratos — CU-CT004 (Parcial)', HeadingLevel.HEADING_2),
        para('Lo que hace hoy finalizarContrato():', { bold: true }),
        bullet('Pone activo = false, estado = inactivo'),
        bullet('Sincroniza estado de la propiedad (la libera para volver a alquilar)'),
        para('Lo que no hace (respecto a "anticipado"):', { bold: true }),
        bullet('No actualiza fecha_fin a la fecha real de corte'),
        bullet('No registra motivo de rescisión'),
        bullet('No detiene explícitamente aumentos futuros más allá de desactivar el contrato'),
        para(
          'Es una finalización operativa, no un flujo legal/contable de rescisión anticipada.'
        ),

        heading('Riesgos principales', HeadingLevel.HEADING_1),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            row([
              cell('Riesgo', { header: true, width: 40 }),
              cell('Impacto', { header: true, width: 20 }),
              cell('CU afectado', { header: true, width: 40 }),
            ]),
            row([
              cell('Bug en detalle de contrato (propuesta de aumento)'),
              cell('Medio'),
              cell('CU-CT008'),
            ]),
            row([cell('Sin cronograma futuro en consulta'), cell('Medio'), cell('CU-CT008')]),
            row([cell('Finalización sin fecha de corte real'), cell('Medio'), cell('CU-CT004')]),
            row([cell('Edge Function no desplegada'), cell('Alto'), cell('CU-AU001')]),
            row([cell('Sin edición de contratos post-alta'), cell('Bajo-Medio'), cell('CU-CT001')]),
            row([
              cell('Portal inquilino parcial/mock'),
              cell('Bajo (admin)'),
              cell('CU-AU005 (visibilidad al inquilino)'),
            ]),
          ],
        }),

        heading('Conclusión', HeadingLevel.HEADING_1),
        para(
          'Para una tesis o demo, 7 de 8 casos críticos están cubiertos en algún grado. Los dos puntos más débiles son:'
        ),
        bullet('CU-CT008 — falta el cronograma completo en consulta + bug en "Próximo aumento"'),
        bullet(
          'CU-CT004 — finalización funcional pero sin semántica de rescisión anticipada'
        ),
        para('Recomendaciones prioritarias:', { bold: true }),
        bullet('Corregir bug en ContratoDetalleModal.jsx (data.propuestas)'),
        bullet('Agregar cronograma futuro en detalle de contrato existente'),
        bullet('Enriquecer finalización anticipada con fecha de corte y motivo'),
        bullet('Verificar deploy de Edge Function sync-argly-icl en Supabase'),

        para(''),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({ text: 'Generado: 21 de junio de 2026', italics: true, size: 18 }),
          ],
        }),
      ],
    },
  ],
})

const buffer = await Packer.toBuffer(doc)
writeFileSync(outputPath, buffer)
console.log(`Documento generado: ${outputPath}`)
