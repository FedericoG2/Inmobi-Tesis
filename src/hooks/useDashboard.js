import { useCallback, useEffect, useState } from 'react'
import { obtenerIpcAnualArgly } from '../services/arglyService'
import { obtenerDashboardAdmin } from '../services/dashboardService'

export function useDashboard() {
  const [kpis, setKpis] = useState(null)
  const [reclamosPendientes, setReclamosPendientes] = useState([])
  const [contratosPorVencer, setContratosPorVencer] = useState([])
  const [ingresoMensual, setIngresoMensual] = useState(0)
  const [aumentosPeriodo, setAumentosPeriodo] = useState(null)
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
      setReclamosPendientes([])
      setContratosPorVencer([])
      setIngresoMensual(0)
      setAumentosPeriodo(null)
    } else {
      setKpis(dashboardResult.data.kpis)
      setReclamosPendientes(dashboardResult.data.reclamosPendientes)
      setContratosPorVencer(dashboardResult.data.contratosPorVencer)
      setIngresoMensual(dashboardResult.data.ingresoMensual)
      setAumentosPeriodo(dashboardResult.data.aumentosPeriodo)
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
    reclamosPendientes,
    contratosPorVencer,
    ingresoMensual,
    aumentosPeriodo,
    ipcAnual,
    ipcAnio,
    ipcError,
    loading,
    error,
    refetch,
  }
}
