export function normalizarSoloDigitos(valor) {
  return (valor ?? '').replace(/\D/g, '')
}

export function normalizarNombreCompleto(valor) {
  return (valor ?? '').trim().replace(/\s+/g, ' ')
}

/** Formato visual: CUIT 11 dígitos → XX-XXXXXXXX-X; DNI sin cambios. */
export function formatearDniCuit(valor) {
  const digitos = normalizarSoloDigitos(valor)
  if (digitos.length === 11) {
    return `${digitos.slice(0, 2)}-${digitos.slice(2, 10)}-${digitos.slice(10)}`
  }
  return digitos
}

/** Teléfono argentino: 351 456 7890 (10 dígitos) o con 0/15. */
export function formatearTelefono(valor) {
  const digitos = normalizarSoloDigitos(valor)
  if (!digitos) return ''

  if (digitos.length === 10) {
    return `${digitos.slice(0, 3)} ${digitos.slice(3, 6)} ${digitos.slice(6)}`
  }

  if (digitos.length === 11 && digitos.startsWith('0')) {
    return `${digitos.slice(0, 4)} ${digitos.slice(4, 7)} ${digitos.slice(7)}`
  }

  return digitos
}
