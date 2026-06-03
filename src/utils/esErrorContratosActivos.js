/** Error de Postgres/Supabase al intentar borrar con contrato activo (trigger P0001). */
export function esErrorContratosActivos(error) {
  if (!error) return false
  const mensaje = (error.message ?? '').toLowerCase()
  return mensaje.includes('contratos activos')
}
