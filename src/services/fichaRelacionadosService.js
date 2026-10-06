import { supabase } from '../supabaseClient'

/** Contratos y reclamos de un inquilino o de una propiedad, para las fichas de detalle. */
export async function listarContratosYReclamos({ inquilinoId = null, propiedadId = null }) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase no configurado. Revisá el archivo .env' } }
  }

  const campo = inquilinoId != null ? 'inquilino_id' : 'propiedad_id'
  const valor = inquilinoId ?? propiedadId
  if (valor == null) return { data: { contratos: [], reclamos: [] }, error: null }

  const [contratosRes, reclamosRes] = await Promise.all([
    supabase
      .from('contratos')
      .select('id, estado, fecha_inicio, fecha_fin, monto_alquiler, inquilinos ( nombre_completo ), propiedades ( direccion )')
      .eq(campo, valor)
      .order('fecha_inicio', { ascending: false }),
    supabase
      .from('reclamos')
      .select('id, titulo, estado, prioridad, fecha_creacion, inquilinos ( nombre_completo ), propiedades ( direccion )')
      .eq(campo, valor)
      .order('fecha_creacion', { ascending: false }),
  ])

  if (contratosRes.error) return { data: null, error: contratosRes.error }
  if (reclamosRes.error) return { data: null, error: reclamosRes.error }

  return { data: { contratos: contratosRes.data ?? [], reclamos: reclamosRes.data ?? [] }, error: null }
}
