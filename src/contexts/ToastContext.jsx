import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import ToastViewport from '../components/ui/ToastViewport'

const ToastContext = createContext(null)

const DURACION_MS = { success: 5000, info: 5000, warning: 7000, error: 8000 }

let siguienteId = 1

/**
 * Avisos efímeros del sistema ("Contrato creado", "Aumento confirmado"…).
 * Uso: const toast = useToast(); toast.success('Título', 'Detalle opcional')
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const cerrar = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const mostrar = useCallback(
    (tono, titulo, detalle) => {
      const id = siguienteId++
      setToasts((prev) => [...prev.slice(-3), { id, tono, titulo, detalle }])
      timers.current.set(
        id,
        setTimeout(() => cerrar(id), DURACION_MS[tono] ?? 5000)
      )
      return id
    },
    [cerrar]
  )

  const api = useMemo(
    () => ({
      success: (titulo, detalle) => mostrar('success', titulo, detalle),
      info: (titulo, detalle) => mostrar('info', titulo, detalle),
      warning: (titulo, detalle) => mostrar('warning', titulo, detalle),
      error: (titulo, detalle) => mostrar('error', titulo, detalle),
      cerrar,
    }),
    [mostrar, cerrar]
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onCerrar={cerrar} />
    </ToastContext.Provider>
  )
}

const SIN_PROVIDER = {
  success: () => {},
  info: () => {},
  warning: () => {},
  error: () => {},
  cerrar: () => {},
}

export function useToast() {
  return useContext(ToastContext) ?? SIN_PROVIDER
}
