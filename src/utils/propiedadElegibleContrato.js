/** Propiedad apta para alta de contrato: estado Disponible. */
export function propiedadElegibleParaContrato(propiedad) {
  if (!propiedad) return false
  return propiedad.estado === 'Disponible'
}

export function etiquetaPropiedadParaContrato(propiedad) {
  if (propiedad.estado === 'Alquilada') {
    return `${propiedad.direccion} (Alquilada)`
  }
  if (propiedad.estado === 'Reservada') {
    return `${propiedad.direccion} (Reservada)`
  }
  if (propiedad.estado === 'Mantenimiento') {
    return `${propiedad.direccion} (Mantenimiento)`
  }
  return propiedad.direccion
}

export const MENSAJE_PROPIEDAD_NO_DISPONIBLE =
  'Solo se pueden crear contratos sobre propiedades en estado Disponible.'

export const MENSAJE_PROPIEDAD_CONTRATO_ACTIVO =
  'Esta propiedad ya tiene un contrato vigente o programado que compromete las fechas seleccionadas.'

export const MENSAJE_SOLAPAMIENTO_CONTRATO =
  'Las fechas se solapan con otro contrato de esta propiedad.'
