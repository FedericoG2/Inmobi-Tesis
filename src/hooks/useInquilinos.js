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

  // Helper interno para limpiar strings vacíos y pasarlos como NULL a Supabase
  const prepararPayload = (datos) => {
    return {
      tipo_persona: datos.tipo_persona || 'Física',
      nombre_completo: datos.nombre_completo,
      dni_cuit: datos.dni_cuit,
      telefono: datos.telefono,
      email: datos.email?.trim() || null, // 🚨 Solución al problema del email
      fecha_nacimiento: datos.fecha_nacimiento || null,
      estado_civil: datos.estado_civil || null,
      ocupacion: datos.ocupacion || null,
      tipo_garantia: datos.tipo_garantia,
      emergencia_nombre: datos.emergencia_nombre || null,
      emergencia_telefono: datos.emergencia_telefono || null,
      observaciones: datos.observaciones || null,
    }
  }

  const crear = useCallback(
    async (datos) => {
      setSubmitting(true)
      setSubmitError(null)

      const payload = prepararPayload(datos)
      const { error: createError } = await crearInquilino(payload)

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

      // Mapeamos explícitamente TODOS los campos para la edición
      const payload = prepararPayload(datos)
      const { error: updateError } = await actualizarInquilino(id, payload)

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