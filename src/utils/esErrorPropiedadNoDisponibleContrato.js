/** Error de Postgres/Supabase al crear contrato sobre propiedad no disponible (trigger P0001). */
export function esErrorPropiedadNoDisponibleContrato(error) {
  if (!error) return false
  const mensaje = (error.message ?? '').toLowerCase()
  return (
    mensaje.includes('propiedades disponibles') ||
    mensaje.includes('propiedad no disponible')
  )
}

export function esErrorPropiedadContratoActivo(error) {
  if (!error) return false
  const mensaje = (error.message ?? '').toLowerCase()
  return mensaje.includes('contrato activo')
}

export function esErrorSolapamientoContrato(error) {
  if (!error) return false
  const mensaje = (error.message ?? '').toLowerCase()
  return mensaje.includes('solapan') || mensaje.includes('solapamiento')
}
