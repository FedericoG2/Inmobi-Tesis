import { useCallback, useEffect, useState } from 'react'
import {
  actualizarPropiedad,
  contarDependenciasPropiedad,
  crearPropiedad,
  eliminarPropiedad,
  esErrorContratosAsociados,
  listarPropiedades,
} from '../services/propiedadesService'

const MENSAJE_CONTRATOS_ACTIVOS = 'No se puede eliminar porque tiene contratos activos'

export function usePropiedades() {
  const [propiedades, setPropiedades] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [actionError, setActionError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await listarPropiedades()

    if (fetchError) {
      setError(fetchError.message)
      setPropiedades([])
    } else {
      setPropiedades(data ?? [])
    }

    setLoading(false)
  }, [])

  const crear = useCallback(
    async (datos) => {
      setSubmitting(true)
      setSubmitError(null)

      const { error: createError } = await crearPropiedad({
        ...datos,
        propietario_id: Number(datos.propietario_id),
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

      const { error: updateError } = await actualizarPropiedad(id, {
        propietario_id: datos.propietario_id,
        direccion: datos.direccion,
        tipo: datos.tipo,
        estado: datos.estado,
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

      const { error: deleteError } = await eliminarPropiedad(id)

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
    propiedades,
    loading,
    error,
    refetch,
    crear,
    actualizar,
    eliminar,
    contarDependenciasPropiedad,
    submitting,
    submitError,
    limpiarSubmitError,
    actionError,
    limpiarActionError,
    mensajeContratosActivos: MENSAJE_CONTRATOS_ACTIVOS,
  }
}
