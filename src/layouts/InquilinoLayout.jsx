import { Outlet } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { PortalInquilinoProvider, usePortalInquilino } from '../contexts/PortalInquilinoContext'
import InquilinoBottomNav from '../components/inquilino/InquilinoBottomNav'
import InquilinoContratoSelector from '../components/inquilino/InquilinoContratoSelector'

function InquilinoHeader() {
  const { inquilino } = usePortalInquilino()

  const primerNombre = inquilino?.nombre_completo?.split(' ')[0] ?? null

  const handleSignOut = () => {
    supabase?.auth.signOut()
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 px-4 py-3.5 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-between">
        <div>
          <p className="text-xs font-medium text-indigo-600 uppercase tracking-wider">Inmobi</p>
          {primerNombre && (
            <p className="text-sm font-semibold text-slate-800">{primerNombre}</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  )
}

export default function InquilinoLayout() {
  return (
    <PortalInquilinoProvider>
      <div className="min-h-screen bg-slate-50 pb-24">
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
