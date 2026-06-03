/** Contrato vigente (activo) de un inquilino, si existe. */
export function buscarContratoActivoPorInquilino(contratos, inquilinoId) {
  if (!inquilinoId) return null
  return (
    contratos.find(
      (c) => String(c.inquilino_id) === String(inquilinoId) && c.activo === true
    ) ?? null
  )
}

/** Inquilinos que tienen al menos un contrato activo (para alta de reclamos). */
export function inquilinosConContratoActivo(inquilinos, contratos) {
  const idsConActivo = new Set(
    contratos.filter((c) => c.activo).map((c) => String(c.inquilino_id))
  )
  return inquilinos.filter((i) => idsConActivo.has(String(i.id)))
}
