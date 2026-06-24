import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { IconDocument, IconUser } from '../../components/icons/NavIcons'
import { usePortalInquilino } from '../../contexts/PortalInquilinoContext'
import { armarResumenAlquilerInquilino } from '../../utils/resumenAlquilerInquilino'

const formatMonto = (monto) => {
  if (monto == null || monto === '') return '—'
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(monto))
}

function IconBuilding({ className = '' }) {
  return (
    <svg
      className={`h-7 w-7 shrink-0 ${className}`.trim()} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
      />
    </svg>
  )
}

function IconAlertInfo({ className = '' }) {
  return (
    <svg
      className={`h-5 w-5 shrink-0 ${className}`.trim()}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
      />
    </svg>
  )
}

function IconWrench() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l5.654-4.654m5.292-8.93a3 3 0 0 1 4.243 4.242M5.196 5.196l13.608 13.608" />
    </svg>
  )
}

function IconPhone() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
      />
    </svg>
  )
}

const quickActions = [
  {
    to: '/inquilino/contrato',
    title: 'Detalles del contrato',
    subtitle: 'Fechas, montos y documentación',
    icon: IconDocument,
    iconClass: 'bg-indigo-100 text-indigo-600',
  },
  {
    to: '/inquilino/reclamos',
    title: 'Nuevo Reclamo',
    subtitle: 'Reportá un problema de mantenimiento',
    icon: IconWrench,
    iconClass: 'bg-amber-100 text-amber-600',
  },
  {
    to: '/inquilino/perfil',
    title: 'Mis datos',
    subtitle: 'Nombre, teléfono y email',
    icon: IconUser,
    iconClass: 'bg-slate-100 text-slate-600',
  },
  {
    title: 'Contactar inmobiliaria',
    subtitle: 'Teléfono, WhatsApp y email',
    icon: IconPhone,
    iconClass: 'bg-emerald-100 text-emerald-600',
    badge: 'Próximamente',
    disabled: true,
  },
]

export default function InquilinoDashboard() {
  const { contratoActivo, loading, error } = usePortalInquilino()

  const resumen = useMemo(
    () => armarResumenAlquilerInquilino(contratoActivo),
    [contratoActivo]
  )

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-slate-500">Cargando tu información...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Resumen de tu Alquiler</h1>

      {!contratoActivo || !resumen ? (
        <div className="rounded-2xl bg-white px-5 py-8 text-center shadow-sm ring-1 ring-slate-100">
          <p className="text-sm font-medium text-slate-600">No tenés un contrato activo actualmente.</p>
          <p className="mt-1 text-xs text-slate-400">Contactá a la inmobiliaria para más información.</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl bg-indigo-600 shadow-sm">
            <div className="flex items-center gap-3 px-4 py-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-indigo-500/60 text-indigo-100">
                <IconBuilding />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200">
                  Propiedad
                </p>
                <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-white">
                  {contratoActivo.propiedades?.direccion ?? '—'}
                </p>
                <p className="mt-0.5 text-xs text-indigo-200">{contratoActivo.propiedades?.tipo}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white px-5 py-5 ring-1 ring-slate-100">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-500">Próximo pago</p>
              {resumen.mesContratoCorto && (
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                  {resumen.mesContratoCorto}
                </span>
              )}
            </div>

            <p className="mt-1 text-[1.75rem] font-bold leading-tight tracking-tight text-slate-900">
              {formatMonto(resumen.monto)}
            </p>

            <p className="mt-1 text-sm text-slate-500">{resumen.periodoResumenLine}</p>

            {resumen.hayAumentoEnPeriodo && resumen.aumentoMesNombre && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-2.5 py-2 ring-1 ring-amber-200/80">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    <IconAlertInfo className="h-4 w-4" />
                  </div>
                  <p className="min-w-0 flex-1 text-xs leading-tight text-slate-800">
                    <span className="font-semibold text-amber-900">
                      Aumento en {resumen.aumentoMesNombre}.
                    </span>{' '}
                    Monto a confirmar con la inmobiliaria.
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <section className="space-y-3">
        <h2 className="text-base font-bold text-slate-900">Acciones rápidas</h2>

        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon
            const content = (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${action.iconClass}`}
                  >
                    <Icon />
                  </div>
                  {action.badge && (
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                      {action.badge}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold leading-snug text-slate-800">{action.title}</p>
                  <p className="mt-1 text-[11px] leading-snug text-slate-500">{action.subtitle}</p>
                </div>
              </>
            )

            if (action.disabled) {
              return (
                <div
                  key={action.title}
                  className="flex flex-col gap-2.5 rounded-2xl bg-white p-3.5 ring-1 ring-slate-100"
                  aria-disabled="true"
                >
                  {content}
                </div>
              )
            }

            return (
              <Link
                key={action.to}
                to={action.to}
                className="flex flex-col gap-2.5 rounded-2xl bg-white p-3.5 ring-1 ring-slate-100 transition hover:ring-indigo-200"
              >
                {content}
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
