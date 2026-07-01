import { Outlet } from 'react-router-dom'
import { PortalInquilinoProvider } from '../contexts/PortalInquilinoContext'
import InquilinoBottomNav from '../components/inquilino/InquilinoBottomNav'
import InquilinoHeader from '../components/inquilino/InquilinoHeader'
import InquilinoSidebar from '../components/inquilino/InquilinoSidebar'

export default function InquilinoLayout() {
  return (
    <PortalInquilinoProvider>
      <div className="min-h-screen bg-slate-50">
        <InquilinoSidebar />

        <div className="flex min-h-screen flex-col lg:ml-64">
          <InquilinoHeader />

          <main className="w-full flex-1 px-4 py-5 pb-28 lg:px-8 lg:py-6 lg:pb-8 xl:px-10">
            <Outlet />
          </main>
        </div>

        <InquilinoBottomNav />
      </div>
    </PortalInquilinoProvider>
  )
}
