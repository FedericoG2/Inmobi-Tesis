import ActividadFeed from '../ui/ActividadFeed'
import { IconClock } from '../icons/Icons'
import { rutaAdminActividad } from '../../utils/actividadUi'
import { calloutClass, cn, iconTileClass, sectionHint, sectionTitle, surfaceCard } from '../../utils/ui'

/** Últimos eventos del sistema, actualizados en vivo. */
export default function DashboardActividadPanel({ eventos, loading, faltaMigracion, error, className = '' }) {
  return (
    <div className={cn(surfaceCard, 'flex flex-col overflow-hidden', className)}>
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={iconTileClass('brand', 'sm')}>
            <IconClock className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className={sectionTitle}>Actividad reciente</h3>
            <p className={cn(sectionHint, 'mt-0')}>Todo lo que pasa en el sistema, en el momento</p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-emerald-700">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          En vivo
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">Cargando actividad…</p>
        ) : faltaMigracion ? (
          <div className="p-4">
            <div className={calloutClass('warning')}>
              Falta instalar el registro de actividad. Ejecutá la migración{' '}
              <code className="font-mono text-xs">20261008_actividad_sistema.sql</code> en Supabase.
            </div>
          </div>
        ) : error ? (
          <div className="p-4">
            <div className={calloutClass('danger')}>{error}</div>
          </div>
        ) : eventos.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            Todavía no hay movimientos registrados. Cuando se cree un contrato, se confirme un aumento o llegue un
            reclamo, lo vas a ver acá.
          </p>
        ) : (
          <ActividadFeed eventos={eventos} rutaDe={rutaAdminActividad} />
        )}
      </div>
    </div>
  )
}
