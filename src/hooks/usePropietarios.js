import { useCallback, useEffect, useState } from 'react'
import {
  actualizarPropietario,
  contarPropiedadesPorPropietario,
  crearPropietario,
  eliminarPropietario,
  listarPropietarios,
} from '../services/propietariosService'
import { esErrorPropiedadesAsociadas } from '../utils/esErrorPropiedadesAsociadas'

const MENSAJE_PROPIEDADES_ASOCIADAS =
  'No se puede eliminar el propietario porque tiene propiedades asociadas'

export function usePropietarios() {
  const [propietarios, setPropietarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [actionError, setActionError] = useState(null)

  const aplicarListado = useCallback(({ data, error: fetchError }) => {
    setError(fetchError ? fetchError.message : null)
    setPropietarios(fetchError ? [] : data ?? [])
    setLoading(false)
  }, [])

  // Recarga sin vaciar la lista: después de cada cambio se ve el dato nuevo sin parpadeo.
  const refetch = useCallback(async () => aplicarListado(await listarPropietarios()), [aplicarListado])

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

      const { error: updateError } = await actualizarPropietario(id, datos)

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
        setActionError(
          esErrorPropiedadesAsociadas(deleteError)
            ? MENSAJE_PROPIEDADES_ASOCIADAS
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
    let vigente = true
    listarPropietarios().then((resultado) => {
      if (vigente) aplicarListado(resultado)
    })
    return () => {
      vigente = false
    }
  }, [aplicarListado])

  return {
    propietarios,
    loading,
    error,
    refetch,
    crear,
    actualizar,
    eliminar,
    contarPropiedadesPorPropietario,
    submitting,
    submitError,
    limpiarSubmitError,
    actionError,
    limpiarActionError,
    mensajePropiedadesAsociadas: MENSAJE_PROPIEDADES_ASOCIADAS,
  }
}
