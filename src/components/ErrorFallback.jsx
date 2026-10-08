import Button from './ui/Button'
import { IconAlert, IconRefresh } from './icons/Icons'
import { iconTileClass, surfaceCard } from '../utils/ui'

export default function ErrorFallback({ error }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className={`${surfaceCard} w-full max-w-md p-8 text-center`}>
        <span className={`${iconTileClass('danger', 'lg', 'circle')} mx-auto`}>
          <IconAlert className="h-5 w-5" />
        </span>
        <h1 className="mt-4 text-base font-semibold text-slate-900">Algo salió mal</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
          {error?.message ?? 'Ocurrió un error inesperado'}
        </p>
        <Button icon={IconRefresh} onClick={() => window.location.reload()} className="mt-6">
          Recargar la página
        </Button>
      </div>
    </div>
  )
}
