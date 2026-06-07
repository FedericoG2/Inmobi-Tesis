/** Etiqueta de propietario en listados (p. ej. propiedad sin propietario asignado). */
export function etiquetaPropietario(registro) {
  if (!registro?.propietario_id) return 'Ninguno'
  return registro.propietarios?.nombre_completo ?? 'Ninguno'
}
