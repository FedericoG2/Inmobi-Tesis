import { useCallback, useEffect, useRef, useState } from 'react'
import { listarActividad, suscribirActividad } from '../services/actividadService'

/**
 * Feed de actividad con actualización en vivo (Supabase Realtime).
 * `onNuevo` se llama con cada evento que llega después de la carga inicial.
 */
export function useActividad({ limite = 20, onNuevo } = {}) {
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [faltaMigracion, setFaltaMigracion] = useState(false)
  const onNuevoRef = useRef(onNuevo)

  useEffect(() => {
    onNuevoRef.current = onNuevo
  }, [onNuevo])

  const refetch = useCallback(async () => {
    const res = await listarActividad({ limite })
    setEventos(res.data)
    setError(res.error && !res.faltaMigracion ? res.error.message : null)
    setFaltaMigracion(res.faltaMigracion)
    setLoading(false)
  }, [limite])

  useEffect(() => {
    let activo = true

    listarActividad({ limite }).then((res) => {
      if (!activo) return
      setEventos(res.data)
      setError(res.error && !res.faltaMigracion ? res.error.message : null)
      setFaltaMigracion(res.faltaMigracion)
      setLoading(false)
    })

    const desuscribir = suscribirActividad((evento) => {
      if (!activo) return
      setEventos((prev) => {
        if (prev.some((e) => e.id === evento.id)) return prev
        return [evento, ...prev].slice(0, limite)
      })
      onNuevoRef.current?.(evento)
    })

    return () => {
      activo = false
      desuscribir()
    }
  }, [limite])

  return { eventos, loading, error, faltaMigracion, refetch }
}
