import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import {
  obtenerInquilinoPorPerfil,
  listarContratosActivosInquilino,
  listarReclamosInquilino,
  crearReclamoPortal,
  actualizarReclamoPortal,
  eliminarReclamoPortal,
} from '../services/portalInquilinoService'

const STORAGE_KEY_CONTRATO = 'portal_inquilino_contrato_id'

const PortalInquilinoContext = createContext(null)

export function PortalInquilinoProvider({ children }) {
  const { user } = useAuth()

  const [inquilino, setInquilino] = useState(null)
  const [contratos, setContratos] = useState([])
  const [contratoSeleccionadoId, setContratoSeleccionadoIdState] = useState(null)
  const [reclamos, setReclamos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reclamosLoading, setReclamosLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const refetchReclamos = useCallback(async (inquilinoId) => {
    if (!inquilinoId) return
    setReclamosLoading(true)
    const { data, error: err } = await listarReclamosInquilino(inquilinoId)
    if (!err) setReclamos(data ?? [])
    setReclamosLoading(false)
  }, [])

  const cargarDatos = useCallback(async () => {
    if (!user?.id) return

    setLoading(true)
    setError(null)

    const { data: inquilinoData, error: inquilinoError } = await obtenerInquilinoPorPerfil(user.id)

    if (inquilinoError) {
      setError(inquilinoError.message)
      setLoading(false)
      return
    }

    if (!inquilinoData) {
      setError('No encontramos tu perfil de inquilino vinculado a esta cuenta. Contactá a la inmobiliaria.')
      setLoading(false)
      return
    }

    setInquilino(inquilinoData)

    const [contratosRes, reclamosRes] = await Promise.all([
      listarContratosActivosInquilino(inquilinoData.id),
      listarReclamosInquilino(inquilinoData.id),
    ])

    if (contratosRes.error) {
      setError(contratosRes.error.message)
    } else {
      const lista = contratosRes.data ?? []
      setContratos(lista)

      const guardado = sessionStorage.getItem(STORAGE_KEY_CONTRATO)
      const idGuardado = guardado ? Number(guardado) : null
      const existe = lista.some((c) => Number(c.id) === idGuardado)
      setContratoSeleccionadoIdState(existe ? idGuardado : (lista[0]?.id ?? null))
    }

    if (!reclamosRes.error) {
      setReclamos(reclamosRes.data ?? [])
    }

    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  const setContratoSeleccionado = useCallback((id) => {
    const numId = Number(id)
    setContratoSeleccionadoIdState(numId)
    if (id) {
      sessionStorage.setItem(STORAGE_KEY_CONTRATO, String(numId))
    } else {
      sessionStorage.removeItem(STORAGE_KEY_CONTRATO)
    }
  }, [])

  const contratoActivo = useMemo(() => {
    if (!contratos.length) return null
    if (contratoSeleccionadoId != null) {
      return contratos.find((c) => Number(c.id) === Number(contratoSeleccionadoId)) ?? contratos[0]
    }
    return contratos[0]
  }, [contratos, contratoSeleccionadoId])

  const crearReclamo = useCallback(
    async (datos) => {
      if (!inquilino) return false

      setSubmitting(true)
      setSubmitError(null)

      const { error: err } = await crearReclamoPortal({
        ...datos,
        inquilino_id: inquilino.id,
      })

      if (err) {
        setSubmitError(err.message)
        setSubmitting(false)
        return false
      }

      await refetchReclamos(inquilino.id)
      setSubmitting(false)
      return true
    },
    [inquilino, refetchReclamos]
  )

  const actualizarReclamo = useCallback(
    async (id, datos) => {
      if (!inquilino) return false

      setSubmitting(true)
      setSubmitError(null)

      const { error: err } = await actualizarReclamoPortal(id, datos, inquilino.id)

      if (err) {
        setSubmitError(err.message)
        setSubmitting(false)
        return false
      }

      await refetchReclamos(inquilino.id)
      setSubmitting(false)
      return true
    },
    [inquilino, refetchReclamos]
  )

  const eliminarReclamo = useCallback(
    async (id) => {
      if (!inquilino) return { error: 'Perfil no disponible' }

      const result = await eliminarReclamoPortal(id, inquilino.id)

      if (result.error) {
        return { error: result.error.message }
      }

      await refetchReclamos(inquilino.id)
      return { ok: true }
    },
    [inquilino, refetchReclamos]
  )

  const limpiarSubmitError = useCallback(() => {
    setSubmitError(null)
  }, [])

  const value = {
    inquilino,
    contratos,
    contratoActivo,
    contratoSeleccionadoId,
    setContratoSeleccionado,
    reclamos,
    loading,
    error,
    reclamosLoading,
    submitting,
    submitError,
    limpiarSubmitError,
    crearReclamo,
    actualizarReclamo,
    eliminarReclamo,
  }

  return (
    <PortalInquilinoContext.Provider value={value}>
      {children}
    </PortalInquilinoContext.Provider>
  )
}

export function usePortalInquilino() {
  const context = useContext(PortalInquilinoContext)
  if (!context) {
    throw new Error('usePortalInquilino debe usarse dentro de PortalInquilinoProvider')
  }
  return context
}
