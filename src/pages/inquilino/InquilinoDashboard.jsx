import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import ProyeccionAumentoInquilinoCard from '../../components/inquilino/ProyeccionAumentoInquilinoCard'
import { PeriodoPagoChips } from '../../components/inquilino/ContratoFechasResumen'
import { IconDocument, IconUser } from '../../components/icons/NavIcons'
import useProyeccionAumentoInquilino from '../../hooks/useProyeccionAumentoInquilino'
import { usePortalInquilino } from '../../contexts/PortalInquilinoContext'
import { armarResumenAlquilerInquilino } from '../../utils/resumenAlquilerInquilino'
import { formatMontoInquilino } from '../../utils/proyeccionAumentoInquilino'
import { portalBadge, portalCardClass, portalEmptyState, portalErrorState, portalLoadingState, portalMontoLg, portalPageShell, portalSection, portalSectionTitle } from '../../utils/portalInquilinoUi'
import PortalPageHeader from '../../components/inquilino/PortalPageHeader'

const formatMonto = formatMontoInquilino

const formatFechaCorta = (iso) => {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
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

function IconWrench() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l5.654-4.654m5.292-8.93a3 3 0 0 1 4.243 4.242M5.196 5.196l13.608 13.608" />
    </svg>
  )
}

const quickActions = [
  {
    to: '/inquilino/contrato',
    title: 'Detalles del contrato',
    subtitle: 'Fechas, montos y documentación',
    icon: IconDocument,
    iconClass: 'bg-brand-100 text-brand-600',
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
]

export default function InquilinoDashboard() {
  const { contratoActivo, loading, error } = usePortalInquilino()
  const contratoFinalizado = contratoActivo && contratoActivo.estado !== 'activo'

  const resumen = useMemo(
    () => (contratoFinalizado ? null : armarResumenAlquilerInquilino(contratoActivo)),
    [contratoActivo, contratoFinalizado]
  )

  const { propuesta, loading: proyeccionLoading, error: proyeccionError } =
    useProyeccionAumentoInquilino(contratoActivo, resumen)

  if (loading) {
    return (
      <div className={portalLoadingState}>
        <p>Cargando tu información...</p>
      </div>
    )
  }

  if (error) {
    return <div className={portalErrorState}>{error}</div>
  }

  return (
    <div className={portalPageShell}>
      <PortalPageHeader
        title="Resumen de tu Alquiler"
        subtitle="Estado de tu contrato, próximo pago y accesos rápidos"
      />

      {contratoFinalizado ? (
        <div className={`${portalCardClass} px-4 py-4 lg:px-5 lg:py-5`}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-500">Contrato finalizado</p>
            <span className={portalBadge}>Historial</span>
          </div>
          <p className="mt-1 text-base font-semibold text-slate-900">
            {contratoActivo.propiedades?.direccion ?? '—'}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Vigencia: {formatFechaCorta(contratoActivo.fecha_inicio)} al {formatFechaCorta(contratoActivo.fecha_fin)}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Último monto: <span className="font-semibold tabular-nums">{formatMonto(contratoActivo.monto_alquiler)}</span>
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Podés consultar los documentos y los reclamos de este contrato, pero no registrar reclamos nuevos.
          </p>
        </div>
      ) : !contratoActivo || !resumen ? (
        <div className={portalEmptyState}>
          <p className="text-sm font-medium text-slate-600">No tenés un contrato activo actualmente.</p>
          <p className="mt-1 text-xs text-slate-400">Contactá a la inmobiliaria para más información.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
          <div className="overflow-hidden rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 shadow-sm lg:col-span-5">
            <div className="flex items-center gap-4 px-4 py-4 lg:px-5 lg:py-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-white/15 text-brand-100 lg:h-16 lg:w-16">
                <IconBuilding />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-200 lg:text-xs">
                  Propiedad
                </p>
                <p className="mt-1 line-clamp-3 text-sm font-semibold leading-snug text-white lg:text-base">
                  {contratoActivo.propiedades?.direccion ?? '—'}
                </p>
                <p className="mt-1 text-xs text-brand-200">{contratoActivo.propiedades?.tipo}</p>
              </div>
            </div>
          </div>

          <div className={`${portalCardClass} px-4 py-4 lg:col-span-7 lg:px-5 lg:py-5`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-500">Próximo pago</p>
              {resumen.mesContratoCorto && (
                <span className={portalBadge}>{resumen.mesContratoCorto}</span>
              )}
            </div>

            <p className={`mt-1 ${portalMontoLg}`}>
              {formatMonto(resumen.monto)}
            </p>

            <PeriodoPagoChips
              periodoLabel={resumen.periodoLabel}
              vencimientoCorto={resumen.vencimientoCorto}
            />

            {resumen.hayAumentoEnPeriodo && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <ProyeccionAumentoInquilinoCard
                  propuesta={propuesta}
                  loading={proyeccionLoading}
                  error={proyeccionError}
                  mesAumento={resumen.aumentoMesNombre}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <section className={portalSection}>
        <h2 className={portalSectionTitle}>Acciones rápidas</h2>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon
            const content = (
              <>
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${action.iconClass}`}
                >
                  <Icon />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-snug text-slate-800">{action.title}</p>
                  <p className="mt-1 text-[11px] leading-snug text-slate-500">{action.subtitle}</p>
                </div>
              </>
            )

            return (
              <Link
                key={action.to}
                to={action.to}
                className={`${portalCardClass} flex flex-col gap-2.5 p-3.5 transition hover:ring-brand-200 lg:p-4`}
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
