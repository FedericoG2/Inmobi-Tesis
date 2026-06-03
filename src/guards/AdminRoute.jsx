import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function AdminRoute() {
  const { isAdmin, isInquilino, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Verificando permisos...</p>
      </div>
    )
  }

  if (isInquilino) {
    return <Navigate to="/inquilino/dashboard" replace />
  }

  if (!isAdmin) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
