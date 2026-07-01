import { supabase } from '../../supabaseClient'
import InquilinoNotificacionesBell from './InquilinoNotificacionesBell'
import InquilinoContratoSelector from './InquilinoContratoSelector'

function IconLogout({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
      />
    </svg>
  )
}

const actionClassName =
  'relative flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-slate-800 lg:h-11 lg:w-11 lg:rounded-2xl'

export default function InquilinoHeader() {
  const handleSignOut = () => {
    supabase?.auth.signOut()
  }

  const acciones = (
    <div className="flex shrink-0 items-center gap-2">
      <InquilinoNotificacionesBell />
      <button
        type="button"
        onClick={handleSignOut}
        className={actionClassName}
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
      >
        <IconLogout />
      </button>
    </div>
  )

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-brand-100/80 bg-brand-50/95 backdrop-blur-md lg:hidden">
        <div className="px-4 py-3">
          <div className="flex items-center justify-end">{acciones}</div>
          <InquilinoContratoSelector className="mt-3" />
        </div>
      </header>

      <header className="sticky top-0 z-20 hidden border-b border-slate-200 bg-white/95 backdrop-blur-sm lg:block">
        <div className="flex h-16 items-center justify-end gap-6 px-8">
          <InquilinoContratoSelector variant="desktop" className="mr-auto min-w-0 flex-1" />
          {acciones}
        </div>
      </header>
    </>
  )
}
