import { supabase } from '../../supabaseClient'
import InmobiLogoMark from '../brand/InmobiLogoMark'
import InquilinoNotificacionesBell from './InquilinoNotificacionesBell'
import InquilinoContratoSelector from './InquilinoContratoSelector'
import { IconLogout } from '../icons/Icons'
import { brandLogoSmClass } from '../../utils/brandUi'
import { buttonClass } from '../../utils/ui'

export default function InquilinoHeader() {
  const handleSignOut = () => {
    supabase?.auth.signOut()
  }

  const acciones = (
    <div className="flex shrink-0 items-center gap-1">
      <InquilinoNotificacionesBell />
      <button
        type="button"
        onClick={handleSignOut}
        className={buttonClass({ variant: 'ghost', size: 'icon' })}
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
      >
        <IconLogout className="h-5 w-5" />
      </button>
    </div>
  )

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <span className={brandLogoSmClass} aria-hidden>
              <InmobiLogoMark className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold tracking-tight text-slate-900">Inmobi</span>
          </div>
          {acciones}
        </div>
        <InquilinoContratoSelector className="px-4 pb-3" />
      </header>

      <header className="sticky top-0 z-20 hidden border-b border-slate-200/80 bg-white/85 backdrop-blur-md lg:block">
        <div className="flex h-14 items-center justify-end gap-6 px-8">
          <InquilinoContratoSelector variant="desktop" className="mr-auto min-w-0 flex-1" />
          {acciones}
        </div>
      </header>
    </>
  )
}
