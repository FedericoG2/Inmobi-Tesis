/** Error de Postgres/Supabase al intentar anular contrato con movimientos (trigger P0001). */
export function esErrorMovimientosContrato(error) {
  if (!error) return false
  const mensaje = (error.message ?? '').toLowerCase()
  return mensaje.includes('movimientos asociados')
}

/** Error al intentar anular un contrato que sigue activo (trigger P0001). */
export function esErrorContratoActivoAnular(error) {
  if (!error) return false
  const mensaje = (error.message ?? '').toLowerCase()
  return mensaje.includes('contrato activo')
}
