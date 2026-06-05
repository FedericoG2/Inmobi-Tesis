import { useCallback, useEffect, useState } from 'react'
import { crearContrato, finalizarContrato, listarContratos } from '../services/contratosService'

export function useContratos() {
  const [contratos, setContratos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [finalizando, setFinalizando] = useState(false)
  const [actionError, setActionError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await listarContratos()

    if (fetchError) {
      setError(fetchError.message)
      setContratos([])
    } else {
      setContratos(data ?? [])
    }

    setLoading(false)
  }, [])

  const crear = useCallback(
    async (datos) => {
      setSubmitting(true)
      setSubmitError(null)

      const porcentaje =
        datos.tipo_ajuste === 'porcentaje_fijo' ? Number(datos.porcentaje_ajuste) : null

      const { error: createError } = await crearContrato({
        inquilino_id: Number(datos.inquilino_id),
        propiedad_id: Number(datos.propiedad_id),
        fecha_inicio: datos.fecha_inicio,
        fecha_fin: datos.fecha_fin,
        monto_alquiler: Number(datos.monto_alquiler),
        monto_inicial: Number(datos.monto_inicial ?? datos.monto_alquiler),
        periodicidad_meses: datos.periodicidad_meses,
        tipo_ajuste: datos.tipo_ajuste,
        porcentaje_ajuste: porcentaje,
        fecha_proximo_aumento: datos.fecha_proximo_aumento,
        dia_vencimiento: datos.dia_vencimiento || null,
        observaciones: datos.observaciones,
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

  const finalizar = useCallback(
    async (id) => {
      setFinalizando(true)
      setActionError(null)

      const { error: finalizeError } = await finalizarContrato(id)

      if (finalizeError) {
        setActionError(finalizeError.message)
        setFinalizando(false)
        return false
      }

      await refetch()
      setFinalizando(false)
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
    contratos,
    loading,
    error,
    refetch,
    crear,
    finalizar,
    submitting,
    submitError,
    limpiarSubmitError,
    finalizando,
    actionError,
    limpiarActionError,
  }
}
