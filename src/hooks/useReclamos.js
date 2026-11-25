import { useCallback, useEffect, useState } from 'react'
import {
  actualizarReclamo,
  crearReclamo,
  eliminarReclamo,
  gestionarReclamo,
  listarReclamos,
} from '../services/reclamosService'

export function useReclamos() {
  const [reclamos, setReclamos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [actionError, setActionError] = useState(null)

  const aplicarListado = useCallback(({ data, error: fetchError }) => {
    setError(fetchError ? fetchError.message : null)
    setReclamos(fetchError ? [] : data ?? [])
    setLoading(false)
  }, [])

  // Recarga sin vaciar la lista: después de cada cambio se ve el dato nuevo sin parpadeo.
  const refetch = useCallback(async () => aplicarListado(await listarReclamos()), [aplicarListado])

  const crear = useCallback(
    async (datos) => {
      setSubmitting(true)
      setSubmitError(null)

      const { data, error: createError } = await crearReclamo({
        inquilino_id: Number(datos.inquilino_id),
        propiedad_id: Number(datos.propiedad_id),
        contrato_id: datos.contrato_id ? Number(datos.contrato_id) : null,
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
      return data ?? true
    },
    [refetch]
  )

  const actualizar = useCallback(
    async (id, datos) => {
      setSubmitting(true)
      setSubmitError(null)

      const { data, error: updateError } = await actualizarReclamo(id, {
        titulo: datos.titulo,
        descripcion: datos.descripcion,
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
      return data ?? true
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

  const gestionar = useCallback(
    async ({ reclamoId, estado = null, comentario = null }) => {
      const { data, error: gestionError } = await gestionarReclamo({
        reclamoId,
        estado,
        comentario,
      })

      if (gestionError) {
        return { ok: false, error: gestionError }
      }

      await refetch()
      return { ok: true, data }
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
    listarReclamos().then((resultado) => {
      if (vigente) aplicarListado(resultado)
    })
    return () => {
      vigente = false
    }
  }, [aplicarListado])

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
    gestionar,
    actionError,
    limpiarActionError,
  }
}
