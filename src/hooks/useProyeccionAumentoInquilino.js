import { useEffect, useState } from 'react'
import { obtenerProyeccionAumentoPortal } from '../services/portalInquilinoService'
import { contratoPuedeProyectarAumento } from '../utils/proyeccionAumentoInquilino'

export default function useProyeccionAumentoInquilino(contrato, resumen) {
  const [propuesta, setPropuesta] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const debeConsultar = contratoPuedeProyectarAumento(contrato, resumen)
  const contratoId = contrato?.id

  useEffect(() => {
    if (!debeConsultar || !contratoId) {
      setPropuesta(null)
      setError(null)
      setLoading(false)
      return
    }

    let cancelado = false

    const cargar = async () => {
      setLoading(true)
      setError(null)

      const { data, error: err } = await obtenerProyeccionAumentoPortal(contratoId)

      if (cancelado) return

      if (err) {
        setPropuesta(null)
        setError(err.message)
      } else if (data?.disponible && data.propuesta) {
        setPropuesta(data.propuesta)
      } else {
        setPropuesta(null)
      }

      setLoading(false)
    }

    cargar()

    return () => {
      cancelado = true
    }
  }, [contratoId, debeConsultar])

  return { propuesta, loading, error, debeConsultar }
}
