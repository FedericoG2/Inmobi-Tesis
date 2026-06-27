import { useCallback, useEffect, useState } from 'react'
import { syncIndices, obtenerUltimosIndicesArgly } from '../services/arglyService'
import {
  calcularAumentosPendientes,
  confirmarAumentos,
  generarComprobantesAumentos,
} from '../services/aumentosService'
import { diasHastaFinMesProximo } from '../utils/aumentosUi'

function formatearErroresConfirmacion(errores) {
  if (!Array.isArray(errores) || errores.length === 0) return ''
  return errores.map((e) => `Contrato #${e.contrato_id}: ${e.error}`).join(' · ')
}

export function useAumentos() {
  const [propuestas, setPropuestas] = useState([])
  const [meta, setMeta] = useState(null)
  const [indicesResumen, setIndicesResumen] = useState({ icl: null, ipc: null })
  const [loading, setLoading] = useState(true)
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState(null)
  const [syncWarning, setSyncWarning] = useState(null)

  const cargarAumentos = useCallback(async ({ diasProximos } = {}) => {
    // Por defecto cubre hasta el fin del mes próximo, así el panorama y el
    // conteo "Aumentan el próximo mes" son completos aunque estemos a comienzo de mes.
    const dias = diasProximos ?? diasHastaFinMesProximo()
    setLoading(true)
    setError(null)

    const { error: syncError } = await syncIndices({ incluirProximos: true, diasProximos: dias })

    if (syncError) {
      setSyncWarning(
        'No pudimos actualizar los índices en este momento. Mostramos los últimos guardados; volvé a intentar más tarde.'
      )
    } else {
      setSyncWarning(null)
    }

    const [{ data, error: calcError }, indicesResult] = await Promise.all([
      calcularAumentosPendientes({
        incluirProximos: true,
        diasProximos: dias,
      }),
      obtenerUltimosIndicesArgly(),
    ])

    if (calcError) {
      setError(calcError.message)
      setPropuestas([])
      setMeta(null)
      setIndicesResumen({ icl: null, ipc: null })
      setLoading(false)
      return false
    }

    const lista = Array.isArray(data?.propuestas) ? data.propuestas : []
    setPropuestas(lista)
    setMeta({ total: lista.length, fecha_calculo: data?.fecha_calculo })

    if (indicesResult.error) {
      setIndicesResumen({ icl: null, ipc: null })
    } else {
      setIndicesResumen({
        icl: indicesResult.data?.icl ?? null,
        ipc: indicesResult.data?.ipc ?? null,
      })
    }
    setLoading(false)
    return true
  }, [])

  useEffect(() => {
    cargarAumentos()
  }, [cargarAumentos])

  const confirmarSeleccionados = useCallback(
    async (propuestasSeleccionadas) => {
      if (!propuestasSeleccionadas.length) {
        setError('No hay aumentos listos para confirmar')
        return { ok: false, data: null, errores: [], contratoIdsConfirmados: [] }
      }

      setConfirmando(true)
      setError(null)

      const { data, error: confirmError } = await confirmarAumentos(propuestasSeleccionadas)

      if (confirmError) {
        setError(confirmError.message)
        setConfirmando(false)
        return { ok: false, data: null, errores: [], contratoIdsConfirmados: [] }
      }

      const confirmados = data?.confirmados ?? 0
      const errores = Array.isArray(data?.errores) ? data.errores : []
      const failedIds = new Set(errores.map((e) => Number(e.contrato_id)))
      const contratoIdsConfirmados = propuestasSeleccionadas
        .map((p) => p.contrato_id)
        .filter((id) => !failedIds.has(Number(id)))

      if (confirmados === 0 && errores.length > 0) {
        setError(formatearErroresConfirmacion(errores))
        setConfirmando(false)
        return { ok: false, data, errores, contratoIdsConfirmados: [] }
      }

      if (errores.length > 0) {
        setSyncWarning(
          `Se confirmaron ${confirmados} aumento(s). ${errores.length} no se aplicaron: ${formatearErroresConfirmacion(errores)}`
        )
      }

      // Genera el comprobante PDF de cada aumento confirmado (best-effort).
      const confirmadas = propuestasSeleccionadas.filter(
        (p) => !failedIds.has(Number(p.contrato_id))
      )
      const { fallidos } = await generarComprobantesAumentos(confirmadas)
      if (fallidos > 0) {
        setSyncWarning((prev) => {
          const aviso = `No se pudo generar el comprobante de ${fallidos} aumento(s).`
          return prev ? `${prev} ${aviso}` : aviso
        })
      }

      await cargarAumentos()
      setConfirmando(false)
      return { ok: true, data, errores, contratoIdsConfirmados }
    },
    [cargarAumentos]
  )

  const limpiarError = useCallback(() => {
    setError(null)
    setSyncWarning(null)
  }, [])

  return {
    propuestas,
    meta,
    indicesResumen,
    loading,
    confirmando,
    error,
    syncWarning,
    cargarAumentos,
    confirmarSeleccionados,
    limpiarError,
  }
}
