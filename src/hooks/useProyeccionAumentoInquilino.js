import { obtenerProyeccionAumentoPortal } from '../services/portalInquilinoService'
import { contratoPuedeProyectarAumento } from '../utils/proyeccionAumentoInquilino'
import { useConsulta } from './useConsulta'

/** Aumento del mes del próximo pago para el portal (RF-078). */
export default function useProyeccionAumentoInquilino(contrato, resumen) {
  const debeConsultar = contratoPuedeProyectarAumento(contrato, resumen)
  const contratoId = contrato?.id
  const fechaAumento = resumen?.fechaAumentoPeriodo ?? null

  const { data, error, cargando } = useConsulta(debeConsultar && contratoId ? [contratoId, fechaAumento] : null, () =>
    obtenerProyeccionAumentoPortal(contratoId, fechaAumento)
  )

  return {
    propuesta: data?.disponible && data.propuesta ? data.propuesta : null,
    loading: cargando,
    error: error?.message ?? null,
    debeConsultar,
  }
}
