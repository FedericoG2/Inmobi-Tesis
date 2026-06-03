/** Etiqueta de propietario en listados (p. ej. propiedad sin propietario tras ON DELETE SET NULL). */
export function etiquetaPropietario(registro) {
  if (!registro?.propietario_id) return 'Ninguno'
  return registro.propietarios?.nombre_completo ?? 'Ninguno'
}
