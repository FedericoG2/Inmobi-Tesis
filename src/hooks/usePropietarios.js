import { useCallback, useEffect, useState } from 'react'
import {
  actualizarPropietario,
  crearPropietario,
  eliminarPropietario,
  listarPropietarios,
} from '../services/propietariosService'

export function usePropietarios() {
  const [propietarios, setPropietarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [actionError, setActionError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await listarPropietarios()

    if (fetchError) {
      setError(fetchError.message)
      setPropietarios([])
    } else {
      setPropietarios(data ?? [])
    }

    setLoading(false)
  }, [])

  const crear = useCallback(
    async (datos) => {
      setSubmitting(true)
      setSubmitError(null)

      const { error: createError } = await crearPropietario(datos)

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

      const { error: updateError } = await actualizarPropietario(id, {
        nombre_completo: datos.nombre_completo,
        dni_cuit: datos.dni_cuit,
        telefono: datos.telefono,
        email: datos.email,
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

      const { error: deleteError } = await eliminarPropietario(id)

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
    propietarios,
    loading,
    error,
    refetch,
    crear,
    actualizar,
    eliminar,
    submitting,
    submitError,
    limpiarSubmitError,
    actionError,
    limpiarActionError,
  }
}
