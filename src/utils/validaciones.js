export const TIPOS_PROPIEDAD = ['Departamento', 'Casa', 'Local comercial']
export const ESTADOS_PROPIEDAD = ['Disponible', 'Alquilada', 'Mantenimiento']

export function validarDireccion(valor) {
  const v = (valor ?? '').trim()
  if (!v) return 'La dirección es obligatoria'
  if (v.length < 5) return 'La dirección debe tener al menos 5 caracteres'
  if (v.length > 200) return 'La dirección no puede superar los 200 caracteres'
  return null
}

export function validarNombreCompleto(valor) {
  const v = (valor ?? '').trim()
  if (!v) return 'El nombre completo es obligatorio'
  if (v.length < 3) return 'El nombre debe tener al menos 3 caracteres'
  if (v.length > 100) return 'El nombre no puede superar los 100 caracteres'
  return null
}

/**
 * DNI: 7-8 dígitos (con o sin puntos).
 * CUIT/CUIL: 11 dígitos numéricos, opcionalmente separados por guiones (XX-XXXXXXXX-X).
 */
export function validarDniCuit(valor) {
  const v = (valor ?? '').trim()
  if (!v) return 'El DNI/CUIT es obligatorio'
  const soloDigitos = v.replace(/[-.\s]/g, '')
  if (!/^\d+$/.test(soloDigitos)) return 'Solo se permiten números, guiones o puntos'
  if (soloDigitos.length >= 7 && soloDigitos.length <= 8) return null
  if (soloDigitos.length === 11) return null
  return 'Ingresá un DNI (7-8 dígitos) o CUIT/CUIL (11 dígitos, con o sin guiones)'
}

export function validarTelefono(valor) {
  const v = (valor ?? '').trim()
  if (!v) return 'El teléfono es obligatorio'
  const soloDigitos = v.replace(/[\s\-+()]/g, '')
  if (!/^\d+$/.test(soloDigitos)) return 'El teléfono solo puede contener números'
  if (soloDigitos.length < 8) return 'El teléfono debe tener al menos 8 dígitos'
  if (soloDigitos.length > 15) return 'El teléfono es demasiado largo'
  return null
}

export function validarEmail(valor) {
  const v = (valor ?? '').trim()
  if (!v) return 'El email es obligatorio'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Ingresá un email válido'
  return null
}
