/*
 * Lectura de la tabla auditoria para la pantalla: qué se cambió y qué valores había antes.
 * Funciones puras: se prueban en tests/unit/auditoriaUi.test.js.
 */
import { nombrePeriodo } from './alquileresUi'

const ENTIDAD = {
  contratos: 'Contrato',
  periodos_alquiler: 'Período',
  aumentos: 'Aumento',
  comprobantes_pago: 'Comprobante de pago',
  reclamos: 'Reclamo',
}

const OPERACION = { alta: 'Alta', modificacion: 'Modificación', baja: 'Baja' }

const CAMPOS = {
  estado: 'Estado',
  monto_alquiler: 'Monto',
  monto: 'Monto',
  monto_anterior: 'Monto anterior',
  monto_nuevo: 'Monto nuevo',
  fecha_ultimo_aumento: 'Último aumento',
  fecha_proximo_aumento: 'Próximo aumento',
  motivo_cierre: 'Motivo de cierre',
  observaciones_cierre: 'Observaciones del cierre',
  fecha_confirmacion: 'Pago confirmado el',
  fecha_aplicacion: 'Rige desde',
  nombre: 'Archivo',
  titulo: 'Título',
  prioridad: 'Prioridad',
  categoria: 'Categoría',
}

// Campos que cambian solos y no aportan a quien lee el historial.
const IGNORADOS = new Set(['updated_at', 'confirmado_por', 'cerrado_en', 'detalle_calculo'])

const ES_MONTO = /^monto/

function formatearValor(campo, valor) {
  if (valor == null || valor === '') return '—'
  if (ES_MONTO.test(campo) && Number.isFinite(Number(valor))) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(valor))
  }
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}/.test(valor)) {
    const [y, m, d] = valor.slice(0, 10).split('-')
    return `${d}/${m}/${y}`
  }
  if (valor === 'inactivo') return 'Cerrado'
  return String(valor)
}

/** Título del registro: "Período abril 2026 · Modificación". */
export function tituloAuditoria(registro) {
  const datos = registro.valor_nuevo ?? registro.valor_anterior ?? {}
  let entidad = ENTIDAD[registro.tabla] ?? registro.tabla
  if (registro.tabla === 'periodos_alquiler' && datos.periodo) entidad = `Período ${nombrePeriodo(datos.periodo).toLowerCase()}`
  if (registro.tabla === 'aumentos' && datos.fecha_aplicacion) entidad = `Aumento de ${nombrePeriodo(datos.fecha_aplicacion).toLowerCase()}`
  return `${entidad} · ${OPERACION[registro.operacion] ?? registro.operacion}`
}

/** Campos que cambiaron en una modificación, con su valor anterior y el nuevo. */
export function cambiosAuditoria(registro) {
  if (registro.operacion !== 'modificacion') return []
  const antes = registro.valor_anterior ?? {}
  const despues = registro.valor_nuevo ?? {}
  return Object.keys(despues)
    .filter((campo) => !IGNORADOS.has(campo) && JSON.stringify(antes[campo]) !== JSON.stringify(despues[campo]))
    .map((campo) => ({
      campo,
      etiqueta: CAMPOS[campo] ?? campo.replace(/_/g, ' '),
      antes: formatearValor(campo, antes[campo]),
      despues: formatearValor(campo, despues[campo]),
    }))
}

/** Resumen de un alta o una baja (los datos principales de la fila). */
export function resumenAuditoria(registro) {
  if (registro.operacion === 'modificacion') return null
  const datos = registro.valor_nuevo ?? registro.valor_anterior ?? {}
  const partes = Object.keys(CAMPOS)
    .filter((campo) => datos[campo] != null && datos[campo] !== '' && campo !== 'estado')
    .slice(0, 3)
    .map((campo) => `${CAMPOS[campo]}: ${formatearValor(campo, datos[campo])}`)
  if (datos.estado) partes.unshift(`Estado: ${formatearValor('estado', datos.estado)}`)
  return partes.join(' · ')
}
