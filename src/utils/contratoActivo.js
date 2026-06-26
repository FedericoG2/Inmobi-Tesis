/** Todos los contratos activos de un inquilino (puede tener más de uno). */
export function contratosActivosPorInquilino(contratos, inquilinoId) {
  if (!inquilinoId) return []
  return contratos.filter(
    (c) => String(c.inquilino_id) === String(inquilinoId) && c.estado === 'activo'
  )
}

/** Contrato vigente (activo) de un inquilino, si existe. Devuelve el primero. */
export function buscarContratoActivoPorInquilino(contratos, inquilinoId) {
  return contratosActivosPorInquilino(contratos, inquilinoId)[0] ?? null
}

/** Inquilinos que tienen al menos un contrato activo (para alta de reclamos). */
export function inquilinosConContratoActivo(inquilinos, contratos) {
  const idsConActivo = new Set(
    contratos.filter((c) => c.estado === 'activo').map((c) => String(c.inquilino_id))
  )
  return inquilinos.filter((i) => idsConActivo.has(String(i.id)))
}
