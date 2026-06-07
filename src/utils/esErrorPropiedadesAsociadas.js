/** Error de Postgres/Supabase al intentar borrar propietario con propiedades (trigger P0001). */
export function esErrorPropiedadesAsociadas(error) {
  if (!error) return false
  const mensaje = (error.message ?? '').toLowerCase()
  return mensaje.includes('propiedades asociadas')
}
