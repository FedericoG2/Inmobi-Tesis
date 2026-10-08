import { supabase } from '../supabaseClient'

const MSG_SUPABASE = 'Supabase no configurado. Revisá el archivo .env'

const COLUMNAS =
  'id, tipo, entidad, entidad_id, titulo, detalle, inquilino_id, contrato_id, visible_inquilino, creado_por, fecha_creacion'

/** Error de tabla inexistente: falta correr la migración 20261008_actividad_sistema.sql. */
function esTablaInexistente(error) {
  if (!error) return false
  return error.code === '42P01' || error.code === 'PGRST205' || /actividad/i.test(error.message ?? '')
}

/**
 * Últimos eventos del sistema. RLS filtra solo: el admin ve todo y el
 * inquilino únicamente los eventos visibles de sus contratos.
 */
export async function listarActividad({ limite = 20 } = {}) {
  if (!supabase) {
    return { data: [], error: { message: MSG_SUPABASE }, faltaMigracion: false }
  }

  const { data, error } = await supabase
    .from('actividad')
    .select(COLUMNAS)
    .order('fecha_creacion', { ascending: false })
    .order('id', { ascending: false })
    .limit(limite)

  if (error) {
    return { data: [], error, faltaMigracion: esTablaInexistente(error) }
  }

  return { data: data ?? [], error: null, faltaMigracion: false }
}

/** Escucha eventos nuevos en vivo. Devuelve la función para desuscribirse. */
export function suscribirActividad(onNuevo) {
  if (!supabase) return () => {}

  const canal = supabase
    .channel(`actividad-${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'actividad' }, (payload) => {
      if (payload?.new) onNuevo(payload.new)
    })
    .subscribe()

  return () => {
    supabase.removeChannel(canal)
  }
}
