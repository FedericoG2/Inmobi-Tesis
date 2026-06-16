import { useCallback, useEffect, useState } from 'react'
import {
  anularContrato,
  contarMovimientosContrato,
  crearContrato,
  finalizarContrato,
  listarContratos,
} from '../services/contratosService'
import { subirDocumentoContrato } from '../services/documentosService'
import {
  esErrorContratoActivoAnular,
  esErrorMovimientosContrato,
} from '../utils/esErrorMovimientosContrato'

const MENSAJE_SOLO_INACTIVO =
  'Solo se pueden anular contratos inactivos. Finalizá el contrato antes de anularlo.'
const MENSAJE_MOVIMIENTOS =
  'No se puede anular el contrato porque tiene aumentos confirmados o reclamos registrados para ese inquilino y propiedad.'

export function useContratos() {
  const [contratos, setContratos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [finalizando, setFinalizando] = useState(false)
  const [anulando, setAnulando] = useState(false)
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

      const { data, error: createError } = await crearContrato({
        inquilino_id: Number(datos.inquilino_id),
        propiedad_id: Number(datos.propiedad_id),
        fecha_inicio: datos.fecha_inicio,
        fecha_fin: datos.fecha_fin,
        monto_alquiler: Number(datos.monto_alquiler),
        monto_inicial: Number(datos.monto_inicial ?? datos.monto_alquiler),
        periodicidad_meses: datos.periodicidad_meses,
        tipo_ajuste: datos.tipo_ajuste,
        fecha_proximo_aumento: datos.fecha_proximo_aumento,
        dia_vencimiento: datos.dia_vencimiento || null,
        observaciones: datos.observaciones,
      })

      if (createError) {
        setSubmitError(createError.message)
        setSubmitting(false)
        return false
      }

      if (datos.archivo_legal && data?.id) {
        const { error: docError } = await subirDocumentoContrato({
          contratoId: data.id,
          propiedadId: datos.propiedad_id,
          archivo: datos.archivo_legal,
          visibleParaInquilino: datos.documento_visible_inquilino ?? true,
        })

        if (docError) {
          setSubmitError(
            `El contrato se creó correctamente, pero no se pudo adjuntar el archivo: ${docError.message}. Podés subirlo desde la ficha del contrato.`
          )
          await refetch()
          setSubmitting(false)
          return false
        }
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

  const anular = useCallback(
    async (contrato) => {
      setAnulando(true)
      setActionError(null)

      if (contrato.estado === 'activo') {
        setActionError(MENSAJE_SOLO_INACTIVO)
        setAnulando(false)
        return false
      }

      const movimientos = await contarMovimientosContrato(
        contrato.id,
        contrato.inquilino_id,
        contrato.propiedad_id
      )

      if (movimientos.error) {
        setActionError(movimientos.error.message)
        setAnulando(false)
        return false
      }

      const total = (movimientos.aumentos ?? 0) + (movimientos.reclamos ?? 0)

      if (total > 0) {
        setActionError(MENSAJE_MOVIMIENTOS)
        setAnulando(false)
        return false
      }

      const { error: deleteError } = await anularContrato(contrato.id)

      if (deleteError) {
        setActionError(
          esErrorContratoActivoAnular(deleteError)
            ? MENSAJE_SOLO_INACTIVO
            : esErrorMovimientosContrato(deleteError)
              ? MENSAJE_MOVIMIENTOS
              : deleteError.message
        )
        setAnulando(false)
        return false
      }

      await refetch()
      setAnulando(false)
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
    anular,
    contarMovimientosContrato,
    submitting,
    submitError,
    limpiarSubmitError,
    finalizando,
    anulando,
    actionError,
    limpiarActionError,
    mensajeMovimientos: MENSAJE_MOVIMIENTOS,
    mensajeSoloInactivo: MENSAJE_SOLO_INACTIVO,
  }
}
