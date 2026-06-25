import { useCallback, useEffect, useState } from 'react'
import { obtenerIpcAnualArgly } from '../services/arglyService'
import { obtenerDashboardAdmin } from '../services/dashboardService'

export function useDashboard() {
  const [kpis, setKpis] = useState(null)
  const [aumentosProximos, setAumentosProximos] = useState([])
  const [aumentosVencidos, setAumentosVencidos] = useState([])
  const [reclamosUrgentes, setReclamosUrgentes] = useState([])
  const [ipcAnual, setIpcAnual] = useState([])
  const [ipcAnio, setIpcAnio] = useState(new Date().getFullYear())
  const [ipcError, setIpcError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    setIpcError(null)

    const anioActual = new Date().getFullYear()

    const [dashboardResult, ipcResult] = await Promise.all([
      obtenerDashboardAdmin(),
      obtenerIpcAnualArgly(anioActual),
    ])

    if (dashboardResult.error) {
      setError(dashboardResult.error.message)
      setKpis(null)
      setAumentosProximos([])
      setAumentosVencidos([])
      setReclamosUrgentes([])
    } else {
      setKpis(dashboardResult.data.kpis)
      setAumentosProximos(dashboardResult.data.aumentosProximos)
      setAumentosVencidos(dashboardResult.data.aumentosVencidos ?? [])
      setReclamosUrgentes(dashboardResult.data.reclamosUrgentes)
    }

    if (ipcResult.error) {
      setIpcAnual([])
      setIpcAnio(anioActual)
      setIpcError(ipcResult.error.message)
    } else {
      setIpcAnual(ipcResult.data.ipcAnual)
      setIpcAnio(ipcResult.data.anio)
      setIpcError(null)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return {
    kpis,
    aumentosProximos,
    aumentosVencidos,
    reclamosUrgentes,
    ipcAnual,
    ipcAnio,
    ipcError,
    loading,
    error,
    refetch,
  }
}
