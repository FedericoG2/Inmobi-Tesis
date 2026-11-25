import { supabase } from '../supabaseClient'

/*
 * Índices cargados a mano (CU-024, tabla indices_manuales): IPC como variación % de un mes o ICL
 * como valor de una fecha. Se usan solo cuando Argly no publicó ese dato; si el oficial existe,
 * se sigue usando el oficial.
 */

const SIN_SUPABASE = { message: 'Supabase no configurado. Revisá el archivo .env' }
const COLUMNAS = 'id, tipo, anio, mes, fecha, valor, fecha_carga'

export async function listarIndicesManuales() {
  if (!supabase) return { data: null, error: SIN_SUPABASE }
  return supabase.from('indices_manuales').select(COLUMNAS).order('anio', { ascending: false }).order('mes', { ascending: false })
}

/** Valida y normaliza un índice antes de guardarlo. Devuelve { datos } o { error }. */
export function validarIndiceManual({ tipo, mes, fecha, valor }) {
  const numero = Number(String(valor ?? '').replace(',', '.'))
  if (tipo === 'ipc') {
    if (!/^\d{4}-\d{2}$/.test(mes ?? '')) return { error: { message: 'Elegí el mes del IPC' } }
    if (!Number.isFinite(numero) || numero <= 0 || numero >= 100) {
      return { error: { message: 'El IPC es la variación del mes en %, mayor que cero: por ejemplo 2,7' } }
    }
    const [anio, numeroMes] = mes.split('-').map(Number)
    return { datos: { tipo, anio, mes: numeroMes, fecha: null, valor: numero } }
  }
  if (tipo === 'icl') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha ?? '')) return { error: { message: 'Elegí la fecha del ICL' } }
    if (!Number.isFinite(numero) || numero <= 0) {
      return { error: { message: 'El ICL es el valor del índice en esa fecha, por ejemplo 27,41' } }
    }
    const [anio, numeroMes] = fecha.split('-').map(Number)
    return { datos: { tipo, anio, mes: numeroMes, fecha, valor: numero } }
  }
  return { error: { message: 'Elegí el índice: IPC o ICL' } }
}

/** Guarda un índice; si ya había uno cargado para ese mes (IPC) o fecha (ICL), lo reemplaza. */
export async function guardarIndiceManual(entrada) {
  if (!supabase) return { data: null, error: SIN_SUPABASE }
  const { datos, error: errorValidacion } = validarIndiceManual(entrada)
  if (errorValidacion) return { data: null, error: errorValidacion }

  let existente = supabase.from('indices_manuales').select('id').eq('tipo', datos.tipo)
  existente = datos.tipo === 'ipc' ? existente.eq('anio', datos.anio).eq('mes', datos.mes) : existente.eq('fecha', datos.fecha)
  const { data: fila, error: errorBusqueda } = await existente.maybeSingle()
  if (errorBusqueda) return { data: null, error: errorBusqueda }

  const consulta = fila
    ? supabase.from('indices_manuales').update({ valor: datos.valor }).eq('id', fila.id)
    : supabase.from('indices_manuales').insert(datos)
  return consulta.select(COLUMNAS).single()
}

/** Guarda varios índices (los que se cargan desde el detalle de un aumento). */
export async function guardarIndicesManuales(entradas) {
  for (const entrada of entradas) {
    const { error } = await guardarIndiceManual(entrada)
    if (error) return { error }
  }
  return { error: null }
}

export async function eliminarIndiceManual(id) {
  if (!supabase) return { error: SIN_SUPABASE }
  const { error } = await supabase.from('indices_manuales').delete().eq('id', id)
  return { error }
}
