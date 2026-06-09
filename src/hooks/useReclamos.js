import { useCallback, useEffect, useState } from 'react'
import {
  actualizarReclamo,
  crearReclamo,
  eliminarReclamo,
  listarReclamos,
} from '../services/reclamosService'

export function useReclamos() {
  const [reclamos, setReclamos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [actionError, setActionError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await listarReclamos()

    if (fetchError) {
      setError(fetchError.message)
      setReclamos([])
    } else {
      setReclamos(data ?? [])
    }

    setLoading(false)
  }, [])

  const crear = useCallback(
    async (datos) => {
      setSubmitting(true)
      setSubmitError(null)

      const { error: createError } = await crearReclamo({
        inquilino_id: Number(datos.inquilino_id),
        propiedad_id: Number(datos.propiedad_id),
        titulo: datos.titulo,
        descripcion: datos.descripcion,
        categoria: datos.categoria,
        estado: 'Pendiente',
        prioridad: datos.prioridad,
      })

      if (createError) {
        setSubmitError(createError.message)
        setSubmitting(false)
        return false
      }

      await refetch()
      setSubmitting(false)
      return true
    },
    [refetch]
  )

  const actualizar = useCallback(
    async (id, datos) => {
      setSubmitting(true)
      setSubmitError(null)

      const { error: updateError } = await actualizarReclamo(id, {
        titulo: datos.titulo,
        descripcion: datos.descripcion,
        estado: datos.estado,
        prioridad: datos.prioridad,
        categoria: datos.categoria,
      })

      if (updateError) {
        setSubmitError(updateError.message)
        setSubmitting(false)
        return false
      }

      await refetch()
      setSubmitting(false)
      return true
    },
    [refetch]
  )

  const eliminar = useCallback(
    async (id) => {
      setActionError(null)

      const { error: deleteError } = await eliminarReclamo(id)

      if (deleteError) {
        setActionError(deleteError.message)
        return false
      }

      await refetch()
      return true
    },
    [refetch]
  )

  const limpiarSubmitError = useCallback(() => {
    setSubmitError(null)
  }, [])

  const limpiarActionError = useCallback(() => {
    setActionError(null)
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return {
    reclamos,
    loading,
    error,
    refetch,
    crear,
    actualizar,
    submitting,
    submitError,
    limpiarSubmitError,
    eliminar,
    actionError,
    limpiarActionError,
  }
}
