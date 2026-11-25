import { useCallback, useEffect, useState } from 'react'
import { obtenerIpcAnualArgly } from '../services/arglyService'
import { obtenerDashboardAdmin } from '../services/dashboardService'

const RESUMEN_VACIO = {
  kpis: null,
  reclamosPendientes: [],
  contratosPorVencer: [],
  ingresoMensual: 0,
  aumentosPeriodo: null,
}

const consultarTodo = () => {
  const anio = new Date().getFullYear()
  return Promise.all([obtenerDashboardAdmin(), obtenerIpcAnualArgly(anio)]).then(([resumen, ipc]) => ({
    resumen,
    ipc,
    anio,
  }))
}

export function useDashboard() {
  const [resumen, setResumen] = useState(RESUMEN_VACIO)
  const [ipc, setIpc] = useState({ anual: [], anio: new Date().getFullYear(), error: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actualizado, setActualizado] = useState(null)

  const aplicarResumen = useCallback((resultado) => {
    setError(resultado.error ? resultado.error.message : null)
    setResumen(resultado.error ? RESUMEN_VACIO : resultado.data)
    setActualizado(new Date())
  }, [])

  const aplicarTodo = useCallback(
    ({ resumen: resultadoResumen, ipc: resultadoIpc, anio }) => {
      aplicarResumen(resultadoResumen)
      setIpc(
        resultadoIpc.error
          ? { anual: [], anio, error: resultadoIpc.error.message }
          : { anual: resultadoIpc.data.ipcAnual, anio: resultadoIpc.data.anio, error: null }
      )
      setLoading(false)
    },
    [aplicarResumen]
  )

  /** silencioso: recalcula los indicadores sin volver a pedir el IPC (lo usa la actividad en vivo). */
  const refetch = useCallback(
    async ({ silencioso = false } = {}) => {
      if (silencioso) {
        const resultado = await obtenerDashboardAdmin()
        if (!resultado.error) aplicarResumen(resultado)
        return
      }
      aplicarTodo(await consultarTodo())
    },
    [aplicarResumen, aplicarTodo]
  )

  useEffect(() => {
    let vigente = true
    consultarTodo().then((resultado) => {
      if (vigente) aplicarTodo(resultado)
    })
    return () => {
      vigente = false
    }
  }, [aplicarTodo])

  return {
    ...resumen,
    ipcAnual: ipc.anual,
    ipcAnio: ipc.anio,
    ipcError: ipc.error,
    loading,
    error,
    actualizado,
    refetch,
  }
}
