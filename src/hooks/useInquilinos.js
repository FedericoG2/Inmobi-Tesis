import { useCallback, useEffect, useState } from 'react'
import {
  actualizarInquilino,
  contarContratosPorInquilino,
  contarDependenciasInquilino,
  crearInquilino,
  eliminarInquilino,
  esErrorContratosAsociados,
  listarInquilinos,
} from '../services/inquilinosService'

const MENSAJE_CONTRATOS_ACTIVOS =
  'No se puede eliminar el inquilino porque tiene contratos asociados (vigentes, programados o finalizados). Se conserva como historial.'

export function useInquilinos() {
  const [inquilinos, setInquilinos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [actionError, setActionError] = useState(null)

  const aplicarListado = useCallback(({ data, error: fetchError }) => {
    setError(fetchError ? fetchError.message : null)
    setInquilinos(fetchError ? [] : data ?? [])
    setLoading(false)
  }, [])

  // Recarga sin vaciar la lista: después de cada cambio se ve el dato nuevo sin parpadeo.
  const refetch = useCallback(async () => aplicarListado(await listarInquilinos()), [aplicarListado])

  const crear = useCallback(
    async (datos) => {
      setSubmitting(true)
      setSubmitError(null)

      const { error: createError } = await crearInquilino(datos)

      if (createError) {
        setSubmitError(
          typeof createError === 'string'
            ? createError
            : createError?.message ?? 'No se pudo guardar el inquilino'
        )
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

      const { error: updateError } = await actualizarInquilino(id, datos)

      if (updateError) {
        setSubmitError(
          typeof updateError === 'string'
            ? updateError
            : updateError?.message ?? 'No se pudo guardar el inquilino'
        )
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
    let vigente = true
    listarInquilinos().then((resultado) => {
      if (vigente) aplicarListado(resultado)
    })
    return () => {
      vigente = false
    }
  }, [aplicarListado])

  return {
    inquilinos,
    loading,
    error,
    refetch,
    crear,
    actualizar,
    eliminar,
    contarContratosPorInquilino,
    contarDependenciasInquilino,
    submitting,
    submitError,
    limpiarSubmitError,
    actionError,
    limpiarActionError,
    mensajeContratosAsociados: MENSAJE_CONTRATOS_ACTIVOS,
  }
}