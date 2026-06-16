export function formatearMontoInput(valor) {
  const digits = String(valor ?? '').replace(/\D/g, '')
  if (!digits) return ''
  const n = Number(digits)
  return `$ ${n.toLocaleString('es-AR')}`
}

export function parsearMontoInput(valor) {
  const digits = String(valor ?? '').replace(/\D/g, '')
  if (!digits) return ''
  return Number(digits)
}
