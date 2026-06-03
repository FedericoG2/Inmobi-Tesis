import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import AdminRoute from '../guards/AdminRoute'
import InquilinoRoute from '../guards/InquilinoRoute'
import ProtectedRoute from '../guards/ProtectedRoute'
import LoginPage from '../pages/auth/LoginPage'

const AdminLayout = lazy(() => import('../layouts/admin/AdminLayout'))
const InquilinoLayout = lazy(() => import('../layouts/InquilinoLayout'))
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'))
const AdminPropietarios = lazy(() => import('../pages/admin/AdminPropietarios'))
const AdminPropiedades = lazy(() => import('../pages/admin/AdminPropiedades'))
const AdminInquilinos = lazy(() => import('../pages/admin/AdminInquilinos'))
const AdminContratos = lazy(() => import('../pages/admin/AdminContratos'))
const AdminReclamos = lazy(() => import('../pages/admin/AdminReclamos'))
const InquilinoDashboard = lazy(() => import('../pages/inquilino/InquilinoDashboard'))
const InquilinoReclamos = lazy(() => import('../pages/inquilino/InquilinoReclamos'))
const InquilinoDocumentos = lazy(() => import('../pages/inquilino/InquilinoDocumentos'))

function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-sm text-slate-500">Cargando...</p>
    </div>
  )
}

function RootRedirect() {
  const { isAuthenticated, isAdmin, isInquilino, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Cargando...</p>
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (isAdmin) return <Navigate to="/admin/dashboard" replace />
  if (isInquilino) return <Navigate to="/inquilino/dashboard" replace />

  return <Navigate to="/login" replace />
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<RootRedirect />} />

            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="propietarios" element={<AdminPropietarios />} />
                <Route path="propiedades" element={<AdminPropiedades />} />
                <Route path="inquilinos" element={<AdminInquilinos />} />
                <Route path="contratos" element={<AdminContratos />} />
                <Route path="reclamos" element={<AdminReclamos />} />
              </Route>
            </Route>

            <Route element={<InquilinoRoute />}>
              <Route path="/inquilino" element={<InquilinoLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<InquilinoDashboard />} />
                <Route path="reclamos" element={<InquilinoReclamos />} />
                <Route path="documentos" element={<InquilinoDocumentos />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
