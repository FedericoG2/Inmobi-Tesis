/** Propiedad apta para alta de contrato: estado Disponible y sin contrato activo. */
export function propiedadElegibleParaContrato(propiedad, idsPropiedadesConContratoActivo) {
  if (!propiedad) return false
  if (propiedad.estado !== 'Disponible') return false
  if (idsPropiedadesConContratoActivo.has(String(propiedad.id))) return false
  return true
}

export function etiquetaPropiedadParaContrato(propiedad, idsPropiedadesConContratoActivo) {
  if (idsPropiedadesConContratoActivo.has(String(propiedad.id))) {
    return `${propiedad.direccion} (contrato activo)`
  }
  if (propiedad.estado === 'Alquilada') {
    return `${propiedad.direccion} (Alquilada)`
  }
  if (propiedad.estado === 'Mantenimiento') {
    return `${propiedad.direccion} (Mantenimiento)`
  }
  return propiedad.direccion
}

export const MENSAJE_PROPIEDAD_NO_DISPONIBLE =
  'Solo se pueden crear contratos sobre propiedades en estado Disponible.'

export const MENSAJE_PROPIEDAD_CONTRATO_ACTIVO =
  'Esta propiedad ya tiene un contrato activo. Finalizalo antes de crear otro.'
