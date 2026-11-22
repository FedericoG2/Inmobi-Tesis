import { useEffect } from 'react'
import { useConsulta } from './useConsulta'
import { listarAlquileresDelMes } from '../services/alquileresService'
import { suscribirActividad } from '../services/actividadService'

/** Alquileres de un mes (un renglón por período). `mes` es el primer día del mes: YYYY-MM-01. */
export function useAlquileresDelMes(mes) {
  const consulta = useConsulta(mes, () => listarAlquileresDelMes(mes))
  const { recargar } = consulta

  // En vivo: un comprobante nuevo o un aumento confirmado cambian el estado de los períodos.
  useEffect(
    () =>
      suscribirActividad((evento) => {
        if (evento.entidad === 'pago' || evento.entidad === 'aumento') recargar()
      }),
    [recargar]
  )

  return {
    periodos: consulta.data ?? [],
    loading: consulta.cargandoPrimeraVez,
    error: consulta.error ? (consulta.error.message ?? 'No se pudieron cargar los alquileres') : null,
    refetch: recargar,
  }
}
