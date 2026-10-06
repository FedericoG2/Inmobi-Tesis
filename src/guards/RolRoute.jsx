import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/** Deja pasar solo al rol indicado; los demás vuelven a su pantalla de inicio. */
export default function RolRoute({ rol: rolPermitido }) {
  const { rol, rutaInicio, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Verificando permisos...</p>
      </div>
    )
  }

  if (rol !== rolPermitido) {
    return <Navigate to={rutaInicio ?? '/login'} replace />
  }

  return <Outlet />
}
