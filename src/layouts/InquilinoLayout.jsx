import { Outlet } from 'react-router-dom'
import { PortalInquilinoProvider } from '../contexts/PortalInquilinoContext'
import InquilinoBottomNav from '../components/inquilino/InquilinoBottomNav'
import InquilinoContratoSelector from '../components/inquilino/InquilinoContratoSelector'
import InquilinoHeader from '../components/inquilino/InquilinoHeader'

export default function InquilinoLayout() {
  return (
    <PortalInquilinoProvider>
      <div className="min-h-screen bg-slate-50 pb-28">
        <InquilinoHeader />
        <InquilinoContratoSelector />
        <main className="mx-auto max-w-lg px-4 py-5">
          <Outlet />
        </main>
        <InquilinoBottomNav />
      </div>
    </PortalInquilinoProvider>
  )
}
