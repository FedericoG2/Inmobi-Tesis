import { supabase } from '../../supabaseClient'
import InmobiLogoMark from '../brand/InmobiLogoMark'
import { IconLogout } from '../icons/Icons'
import { RanuraAcciones, RanuraTitulo } from '../../contexts/EncabezadoContext'
import { brandLogoSmClass } from '../../utils/brandUi'
import { buttonClass } from '../../utils/ui'

/**
 * Barra superior de los portales: título de la página, acciones, selector de contrato y salida.
 * En celulares suma la marca y el selector de contrato va debajo.
 * `selector(variant)` dibuja el selector de contrato de cada portal.
 */
export default function PortalHeader({ selector }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md lg:z-20">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <span className={`${brandLogoSmClass} lg:hidden`} aria-hidden>
          <InmobiLogoMark className="h-4 w-4" />
        </span>
        <RanuraTitulo className="flex-1" />
        {selector?.('desktop')}
        <RanuraAcciones />
        <button
          type="button"
          onClick={() => supabase?.auth.signOut()}
          className={`${buttonClass({ variant: 'ghost', size: 'icon' })} shrink-0`}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <IconLogout className="h-5 w-5" />
        </button>
      </div>
      <div className="lg:hidden">{selector?.('mobile')}</div>
    </header>
  )
}
