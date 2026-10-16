/** Etiqueta de propietario en listados (p. ej. propiedad sin propietario asignado). */
export function etiquetaPropietario(registro) {
  if (!registro?.propietario_id) return 'Sin asignar'
  return registro.propietarios?.nombre_completo ?? 'Sin asignar'
}
