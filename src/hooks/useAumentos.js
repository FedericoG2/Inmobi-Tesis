import { useCallback, useEffect, useState } from 'react'
import {
  calcularAumentosPendientes,
  confirmarAumentos,
  ejecutarMantenimientoContratos,
  generarComprobantesAumentos,
  listarAumentosConfirmadosEnPeriodo,
  recalcularPropuestasConOverrides,
} from '../services/aumentosService'
import { diasHastaFinPeriodoOperativo, hoyIsoLocal, periodoOperativoInfo } from '../utils/aumentosUi'

function formatearErroresConfirmacion(errores) {
  if (!Array.isArray(errores) || errores.length === 0) return ''
  return errores.map((e) => `Contrato #${e.contrato_id}: ${e.error}`).join(' · ')
}

export function useAumentos() {
  const [propuestas, setPropuestas] = useState([])
  const [confirmadosPeriodo, setConfirmadosPeriodo] = useState([])
  const [meta, setMeta] = useState(null)
  const [indicesResumen, setIndicesResumen] = useState({ icl: null, ipc: null })
  const [loading, setLoading] = useState(true)
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState(null)
  const [syncWarning, setSyncWarning] = useState(null)
  const [colaCalculo, setColaCalculo] = useState({
    contratos: [],
    series: { icl: [], ipc: [] },
    acordadosPorClave: {},
  })
  const [overrides, setOverrides] = useState({})

  const cargarAumentos = useCallback(async ({ diasProximos, keepOverrides = false } = {}) => {
    const dias = diasProximos ?? diasHastaFinPeriodoOperativo()
    setLoading(true)
    setError(null)
    if (!keepOverrides) setOverrides({})

    const clavePeriodo = periodoOperativoInfo(hoyIsoLocal()).clave
    const confirmadosPromise = listarAumentosConfirmadosEnPeriodo({ claveMes: clavePeriodo })

    await ejecutarMantenimientoContratos()

    const [{ data, error: calcError }, confirmadosResult] = await Promise.all([
      calcularAumentosPendientes({
        incluirProximos: true,
        diasProximos: dias,
        skipMaintenance: true,
        overrides: keepOverrides ? overrides : {},
      }),
      confirmadosPromise,
    ])

    if (calcError) {
      setError(calcError.message)
      setPropuestas([])
      setConfirmadosPeriodo([])
      setMeta(null)
      setIndicesResumen({ icl: null, ipc: null })
      setLoading(false)
      return false
    }

    const lista = Array.isArray(data?.propuestas) ? data.propuestas : []
    setPropuestas(lista)
    setConfirmadosPeriodo(
      confirmadosResult.error ? [] : Array.isArray(confirmadosResult.data) ? confirmadosResult.data : []
    )
    setMeta({ total: lista.length, fecha_calculo: data?.fecha_calculo })
    setIndicesResumen(data?.indicesResumen ?? { icl: null, ipc: null })
    setColaCalculo({
      contratos: data?.contratos ?? [],
      series: data?.series ?? { icl: [], ipc: [] },
      acordadosPorClave: data?.acordadosPorClave ?? {},
    })

    if (data?.indicesError) {
      setSyncWarning(
        'No pudimos obtener los índices oficiales (Argly). Podés cargarlos a mano en el detalle de cada aumento.'
      )
    } else {
      setSyncWarning(null)
    }

    setLoading(false)
    return true
  }, [overrides])

  useEffect(() => {
    cargarAumentos()
    // Primera carga: no re-disparar cuando cambian overrides.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const aplicarIndicesManuales = useCallback((contratoId, override) => {
    setOverrides((prev) => {
      const next = { ...prev, [contratoId]: override, [String(contratoId)]: override }
      setPropuestas(
        recalcularPropuestasConOverrides({
          contratos: colaCalculo.contratos,
          series: colaCalculo.series,
          acordadosPorClave: colaCalculo.acordadosPorClave,
          overrides: next,
          hoy: hoyIsoLocal(),
        })
      )
      return next
    })
  }, [colaCalculo])

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

      await cargarAumentos({ keepOverrides: false })
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
    confirmadosPeriodo,
    meta,
    indicesResumen,
    loading,
    confirmando,
    error,
    syncWarning,
    cargarAumentos,
    confirmarSeleccionados,
    aplicarIndicesManuales,
    limpiarError,
  }
}
