import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { AdminLayoutProvider, useAdminLayout } from '../../contexts/AdminLayoutContext'
import { EncabezadoProvider } from '../../contexts/EncabezadoContext'
import AdminSidebar from './AdminSidebar'
import AdminTopbar from './AdminTopbar'

// Módulos del Encargado: se descargan por detrás después de entrar, así pasar de uno a otro no
// espera a bajar el código de la pantalla.
const precargarModulos = () =>
  Promise.allSettled([
    import('../../pages/admin/AdminDashboard'),
    import('../../pages/admin/AdminPropietarios'),
    import('../../pages/admin/AdminPropiedades'),
    import('../../pages/admin/AdminInquilinos'),
    import('../../pages/admin/AdminContratos'),
    import('../../pages/admin/AdminAlquileres'),
    import('../../pages/admin/AdminAumentos'),
    import('../../pages/admin/AdminReclamos'),
  ])

function AdminLayoutContent() {
  const { sidebarCollapsed } = useAdminLayout()

  useEffect(() => {
    const id = setTimeout(precargarModulos, 1500)
    return () => clearTimeout(id)
  }, [])

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar />
      <div
        className={`flex min-h-screen min-w-0 flex-col transition-[margin] duration-200 ease-in-out ${
          sidebarCollapsed ? 'lg:ml-[4.5rem]' : 'lg:ml-64'
        }`}
      >
        <AdminTopbar />
        <main className="flex-1 px-4 py-5 sm:px-6">
          <div className="mx-auto w-full max-w-[1920px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default function AdminLayout() {
  return (
    <AdminLayoutProvider>
      <EncabezadoProvider>
        <AdminLayoutContent />
      </EncabezadoProvider>
    </AdminLayoutProvider>
  )
}
