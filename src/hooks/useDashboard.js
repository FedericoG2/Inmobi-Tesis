import { useCallback, useEffect, useState } from 'react'
import { obtenerDashboardAdmin } from '../services/dashboardService'

export function useDashboard() {
  const [kpis, setKpis] = useState(null)
  const [aumentosProximos, setAumentosProximos] = useState([])
  const [reclamosUrgentes, setReclamosUrgentes] = useState([])
  const [ipcAnual, setIpcAnual] = useState([])
  const [ipcAnio, setIpcAnio] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await obtenerDashboardAdmin()

    if (fetchError) {
      setError(fetchError.message)
      setKpis(null)
      setAumentosProximos([])
      setReclamosUrgentes([])
      setIpcAnual([])
      setIpcAnio(new Date().getFullYear())
    } else {
      setKpis(data.kpis)
      setAumentosProximos(data.aumentosProximos)
      setReclamosUrgentes(data.reclamosUrgentes)
      setIpcAnual(data.ipcAnual)
      setIpcAnio(data.ipcAnio)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return {
    kpis,
    aumentosProximos,
    reclamosUrgentes,
    ipcAnual,
    ipcAnio,
    loading,
    error,
    refetch,
  }
}
