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
import { suscribirActividad } from '../services/actividadService'

const STORAGE_KEY_CONTRATO = 'portal_inquilino_contrato_id'

const PortalInquilinoContext = createContext(null)

// Vigentes primero; después los finalizados (historial), cada grupo por fecha de inicio.
const ordenarContratos = (lista) =>
  [...lista].sort((a, b) => {
    if (a.estado !== b.estado) return a.estado === 'activo' ? -1 : 1
    return (b.fecha_inicio ?? '').localeCompare(a.fecha_inicio ?? '')
  })

/** Ficha del inquilino de la sesión, sus contratos (activos y finalizados) y sus reclamos. */
async function consultarPortal(userId) {
  const { data: inquilino, error: inquilinoError } = await obtenerInquilinoPorPerfil(userId)
  if (inquilinoError) return { error: inquilinoError.message }
  if (!inquilino) {
    return { error: 'No encontramos tu perfil de inquilino vinculado a esta cuenta. Contactá a la inmobiliaria.' }
  }

  const [contratosRes, reclamosRes] = await Promise.all([
    listarContratosActivosInquilino(inquilino.id),
    listarReclamosInquilino(inquilino.id),
  ])

  return {
    inquilino,
    error: contratosRes.error?.message ?? null,
    contratos: contratosRes.error ? null : ordenarContratos(contratosRes.data ?? []),
    reclamos: reclamosRes.error ? null : (reclamosRes.data ?? []),
  }
}

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
  // Sube cuando la inmobiliaria confirma o deshace un pago: la pantalla de Pagos vuelve a consultar.
  const [versionPagos, setVersionPagos] = useState(0)

  const refetchReclamos = useCallback(async (inquilinoId) => {
    if (!inquilinoId) return
    setReclamosLoading(true)
    const { data, error: err } = await listarReclamosInquilino(inquilinoId)
    if (!err) setReclamos(data ?? [])
    setReclamosLoading(false)
  }, [])

  const aplicarPortal = useCallback(({ error: errorCarga, inquilino: ficha, contratos: lista, reclamos: propios }) => {
    if (ficha) setInquilino(ficha)
    if (lista) {
      setContratos(lista)
      const guardado = sessionStorage.getItem(STORAGE_KEY_CONTRATO)
      const idGuardado = guardado ? Number(guardado) : null
      const existe = lista.some((c) => Number(c.id) === idGuardado)
      setContratoSeleccionadoIdState(existe ? idGuardado : (lista[0]?.id ?? null))
    }
    if (propios) setReclamos(propios)
    setError(errorCarga ?? null)
    setLoading(false)
  }, [])

  const userId = user?.id
  useEffect(() => {
    if (!userId) return undefined
    let vigente = true
    consultarPortal(userId).then((resultado) => {
      if (vigente) aplicarPortal(resultado)
    })
    return () => {
      vigente = false
    }
  }, [userId, aplicarPortal])

  // En vivo: cuando la inmobiliaria gestiona un reclamo, confirma un aumento o un pago, o cambia
  // el contrato, el portal se actualiza sin recargar (RLS filtra los eventos ajenos).
  const inquilinoId = inquilino?.id
  useEffect(() => {
    if (!inquilinoId) return undefined
    return suscribirActividad(async (evento) => {
      if (evento.entidad === 'pago') {
        setVersionPagos((v) => v + 1)
      } else if (evento.entidad === 'reclamo') {
        const { data, error: err } = await listarReclamosInquilino(inquilinoId)
        if (!err) setReclamos(data ?? [])
      } else if (['contrato', 'aumento', 'documento'].includes(evento.entidad)) {
        const { data, error: err } = await listarContratosActivosInquilino(inquilinoId)
        if (!err) setContratos(ordenarContratos(data ?? []))
      }
    })
  }, [inquilinoId])

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

      const { error: err, imagenesFallidas = [] } = await crearReclamoPortal({
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
      return { ok: true, imagenesFallidas }
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

  const puedeReclamar = contratoActivo?.estado === 'activo'

  const value = {
    inquilino,
    contratos,
    contratoActivo,
    puedeReclamar,
    versionPagos,
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
