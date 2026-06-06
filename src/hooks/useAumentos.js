import { useCallback, useEffect, useState } from 'react'
import { syncIndices } from '../services/arglyService'
import {
  calcularAumentosPendientes,
  confirmarAumentos,
  listarColaAumentos,
} from '../services/aumentosService'

export function useAumentos() {
  const [cola, setCola] = useState(null)
  const [colaLoading, setColaLoading] = useState(true)
  const [propuestas, setPropuestas] = useState([])
  const [meta, setMeta] = useState(null)
  const [calculando, setCalculando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState(null)
  const [syncWarning, setSyncWarning] = useState(null)
  const [syncInfo, setSyncInfo] = useState(null)

  const cargarCola = useCallback(async ({ diasProximos = 30 } = {}) => {
    setColaLoading(true)
    const { data, error: colaError } = await listarColaAumentos({ diasProximos })

    if (colaError) {
      setError((prev) => prev ?? colaError.message)
      setCola(null)
    } else {
      setCola(data)
    }

    setColaLoading(false)
  }, [])

  useEffect(() => {
    cargarCola()
  }, [cargarCola])

  const calcularPendientes = useCallback(async ({ incluirProximos = false, diasProximos = 30 } = {}) => {
    setCalculando(true)
    setError(null)
    setSyncWarning(null)
    setSyncInfo(null)

    const { data: syncData, error: syncError } = await syncIndices({ incluirProximos, diasProximos })

    if (syncError) {
      setSyncWarning(
        `No se pudo sincronizar índices con Argly (${syncError.message}). Se usaron índices ya guardados.`
      )
    } else if (syncData) {
      setSyncInfo(syncData)
    }

    const { data, error: calcError } = await calcularAumentosPendientes({ incluirProximos, diasProximos })

    if (calcError) {
      setError(calcError.message)
      setPropuestas([])
      setMeta(null)
      setCalculando(false)
      return false
    }

    const lista = data?.propuestas ?? []
    setPropuestas(Array.isArray(lista) ? lista : [])
    setMeta({ total: data?.total ?? lista.length, fecha_calculo: data?.fecha_calculo })
    setCalculando(false)
    return true
  }, [])

  const confirmarSeleccionados = useCallback(async (propuestasSeleccionadas) => {
    if (!propuestasSeleccionadas.length) {
      setError('No hay aumentos seleccionados para confirmar')
      return { ok: false, data: null }
    }

    setConfirmando(true)
    setError(null)

    const { data, error: confirmError } = await confirmarAumentos(propuestasSeleccionadas)

    if (confirmError) {
      setError(confirmError.message)
      setConfirmando(false)
      return { ok: false, data: null }
    }

    await cargarCola()
    setConfirmando(false)
    return { ok: true, data }
  }, [cargarCola])

  const limpiarError = useCallback(() => {
    setError(null)
    setSyncWarning(null)
  }, [])

  return {
    cola,
    colaLoading,
    cargarCola,
    propuestas,
    meta,
    syncInfo,
    syncWarning,
    calculando,
    confirmando,
    error,
    calcularPendientes,
    confirmarSeleccionados,
    limpiarError,
    setPropuestas,
  }
}
