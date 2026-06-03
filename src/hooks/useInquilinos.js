import { useCallback, useEffect, useState } from 'react'
import {
  actualizarInquilino,
  contarContratosPorInquilino,
  crearInquilino,
  eliminarInquilino,
  esErrorContratosAsociados,
  listarInquilinos,
} from '../services/inquilinosService'

const MENSAJE_CONTRATOS_ACTIVOS =
  'No se puede eliminar el inquilino porque tiene contratos activos'

export function useInquilinos() {
  const [inquilinos, setInquilinos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [actionError, setActionError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await listarInquilinos()

    if (fetchError) {
      setError(fetchError.message)
      setInquilinos([])
    } else {
      setInquilinos(data ?? [])
    }

    setLoading(false)
  }, [])

  const crear = useCallback(
    async (datos) => {
      setSubmitting(true)
      setSubmitError(null)

      const { error: createError } = await crearInquilino(datos)

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

      const { error: updateError } = await actualizarInquilino(id, {
        nombre_completo: datos.nombre_completo,
        dni_cuit: datos.dni_cuit,
        telefono: datos.telefono,
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

      const { error: deleteError } = await eliminarInquilino(id)

      if (deleteError) {
        setActionError(
          esErrorContratosAsociados(deleteError)
            ? MENSAJE_CONTRATOS_ACTIVOS
            : deleteError.message
        )
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
    inquilinos,
    loading,
    error,
    refetch,
    crear,
    actualizar,
    eliminar,
    contarContratosPorInquilino,
    submitting,
    submitError,
    limpiarSubmitError,
    actionError,
    limpiarActionError,
    mensajeContratosAsociados: MENSAJE_CONTRATOS_ACTIVOS,
  }
}
