import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import {
  listarContratosPropietario,
  listarPropiedadesPropietario,
  obtenerPropietarioPorPerfil,
} from '../services/portalPropietarioService'

const STORAGE_KEY_CONTRATO = 'portal_propietario_contrato_id'

const PortalPropietarioContext = createContext(null)

// Vigentes primero; después los finalizados, cada grupo por fecha de inicio.
const ordenarContratos = (lista) =>
  [...lista].sort((a, b) => {
    if (a.estado !== b.estado) return a.estado === 'activo' ? -1 : 1
    return (b.fecha_inicio ?? '').localeCompare(a.fecha_inicio ?? '')
  })

/** Ficha del propietario de la sesión, sus propiedades y los contratos de ellas. */
async function consultarPortal(userId) {
  const { data: propietario, error } = await obtenerPropietarioPorPerfil(userId)
  if (error) return { error: error.message }
  if (!propietario) {
    return { error: 'No encontramos tu ficha de propietario vinculada a esta cuenta. Contactá a la inmobiliaria.' }
  }

  const [propiedadesRes, contratosRes] = await Promise.all([listarPropiedadesPropietario(), listarContratosPropietario()])
  return {
    propietario,
    propiedades: propiedadesRes.data ?? [],
    contratos: ordenarContratos(contratosRes.data ?? []),
    error: propiedadesRes.error?.message ?? contratosRes.error?.message ?? null,
  }
}

export function PortalPropietarioProvider({ children }) {
  const { user } = useAuth()
  const [estado, setEstado] = useState({ loading: true, error: null, propietario: null, propiedades: [], contratos: [] })
  const [contratoElegidoId, setContratoElegidoId] = useState(() => {
    const guardado = sessionStorage.getItem(STORAGE_KEY_CONTRATO)
    return guardado ? Number(guardado) : null
  })

  const userId = user?.id
  useEffect(() => {
    if (!userId) return undefined
    let vigente = true
    consultarPortal(userId).then((resultado) => {
      if (vigente) setEstado({ loading: false, propiedades: [], contratos: [], propietario: null, ...resultado })
    })
    return () => {
      vigente = false
    }
  }, [userId])

  const setContratoSeleccionado = useCallback((id) => {
    const numero = id ? Number(id) : null
    setContratoElegidoId(numero)
    if (numero) sessionStorage.setItem(STORAGE_KEY_CONTRATO, String(numero))
    else sessionStorage.removeItem(STORAGE_KEY_CONTRATO)
  }, [])

  // Si el contrato guardado ya no está (o no hay ninguno elegido), se muestra el primero.
  const contratoSeleccionado = useMemo(
    () => estado.contratos.find((c) => Number(c.id) === contratoElegidoId) ?? estado.contratos[0] ?? null,
    [estado.contratos, contratoElegidoId]
  )

  const value = {
    ...estado,
    contratoSeleccionado,
    contratoSeleccionadoId: contratoSeleccionado?.id ?? null,
    setContratoSeleccionado,
  }

  return <PortalPropietarioContext.Provider value={value}>{children}</PortalPropietarioContext.Provider>
}

export function usePortalPropietario() {
  const context = useContext(PortalPropietarioContext)
  if (!context) throw new Error('usePortalPropietario debe usarse dentro de PortalPropietarioProvider')
  return context
}
