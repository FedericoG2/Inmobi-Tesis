import { Outlet } from 'react-router-dom'
import { AdminLayoutProvider, useAdminLayout } from '../../contexts/AdminLayoutContext'
import AdminSidebar from './AdminSidebar'
import AdminTopbar from './AdminTopbar'

function AdminLayoutContent() {
  const { sidebarCollapsed } = useAdminLayout()

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar />
      <div
        className={`flex min-h-screen min-w-0 flex-col transition-[margin] duration-200 ease-in-out ${
          sidebarCollapsed ? 'lg:ml-[4.5rem]' : 'lg:ml-64'
        }`}
      >
        <AdminTopbar />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1400px]">
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
      <AdminLayoutContent />
    </AdminLayoutProvider>
  )
}
