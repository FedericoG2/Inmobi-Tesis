import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import ProyeccionAumentoInquilinoCard from '../../components/inquilino/ProyeccionAumentoInquilinoCard'
import { PeriodoPagoChips } from '../../components/inquilino/ContratoFechasResumen'
import useProyeccionAumentoInquilino from '../../hooks/useProyeccionAumentoInquilino'
import { usePortalInquilino } from '../../contexts/PortalInquilinoContext'
import { armarResumenAlquilerInquilino } from '../../utils/resumenAlquilerInquilino'
import { formatMontoInquilino } from '../../utils/proyeccionAumentoInquilino'
import {
  portalBadge,
  portalCardClass,
  portalEmptyState,
  portalErrorState,
  portalLoadingState,
  portalMontoLg,
  portalPageShell,
  portalSection,
  portalSectionTitle,
} from '../../utils/portalInquilinoUi'
import PortalPageHeader from '../../components/inquilino/PortalPageHeader'
import {
  IconArrowRight,
  IconBuilding,
  IconDocument,
  IconUser,
  IconWrench,
} from '../../components/icons/Icons'
import { cn, iconTileClass } from '../../utils/ui'

const formatMonto = formatMontoInquilino

const formatFechaCorta = (iso) => {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const quickActions = [
  {
    to: '/inquilino/contrato',
    title: 'Detalles del contrato',
    subtitle: 'Fechas, montos y documentación',
    icon: IconDocument,
  },
  {
    to: '/inquilino/reclamos',
    title: 'Nuevo reclamo',
    subtitle: 'Reportá un problema de mantenimiento',
    icon: IconWrench,
  },
  {
    to: '/inquilino/perfil',
    title: 'Mis datos',
    subtitle: 'Nombre, teléfono y email',
    icon: IconUser,
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
        <p>Cargando tu información…</p>
      </div>
    )
  }

  if (error) {
    return <div className={portalErrorState}>{error}</div>
  }

  return (
    <div className={portalPageShell}>
      <PortalPageHeader
        title="Resumen de tu alquiler"
        subtitle="Estado de tu contrato, próximo pago y accesos rápidos."
      />

      {contratoFinalizado ? (
        <div className={`${portalCardClass} p-5`}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-slate-500">Contrato finalizado</p>
            <span className={portalBadge}>Historial</span>
          </div>
          <p className="mt-1 text-lg font-semibold text-slate-900">{contratoActivo.propiedades?.direccion ?? '—'}</p>
          <dl className="mt-3 space-y-1 text-sm text-slate-600">
            <div>
              Vigencia: {formatFechaCorta(contratoActivo.fecha_inicio)} al {formatFechaCorta(contratoActivo.fecha_fin)}
            </div>
            <div>
              Último monto:{' '}
              <span className="font-medium tabular-nums text-slate-900">{formatMonto(contratoActivo.monto_alquiler)}</span>
            </div>
          </dl>
          <p className="mt-3 text-sm text-slate-500">
            Podés consultar los documentos y los reclamos de este contrato, pero no registrar reclamos nuevos.
          </p>
        </div>
      ) : !contratoActivo || !resumen ? (
        <div className={portalEmptyState}>
          <p className="text-sm font-medium text-slate-700">No tenés un contrato activo actualmente.</p>
          <p className="mt-1 text-sm text-slate-500">Contactá a la inmobiliaria para más información.</p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-12 lg:gap-6">
          <div className="relative overflow-hidden rounded-xl bg-brand-700 shadow-card lg:col-span-5">
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-500/40 blur-2xl"
              aria-hidden
            />
            <div className="relative flex h-full flex-col justify-between gap-6 p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10 text-white ring-1 ring-inset ring-white/15">
                <IconBuilding className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-brand-200">Tu propiedad</p>
                <p className="mt-1 line-clamp-3 text-lg font-semibold leading-snug text-white">
                  {contratoActivo.propiedades?.direccion ?? '—'}
                </p>
                {contratoActivo.propiedades?.tipo && (
                  <p className="mt-1 text-sm text-brand-200">{contratoActivo.propiedades.tipo}</p>
                )}
              </div>
            </div>
          </div>

          <div className={`${portalCardClass} p-5 lg:col-span-7`}>
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
                <div className="flex items-start justify-between gap-2">
                  <span className={iconTileClass('brand')}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <IconArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
                </div>
                <div>
                  <p className="text-sm font-medium leading-snug text-slate-900">{action.title}</p>
                  <p className="mt-0.5 text-xs leading-snug text-slate-500">{action.subtitle}</p>
                </div>
              </>
            )

            return (
              <Link
                key={action.to}
                to={action.to}
                className={cn(portalCardClass, 'group flex flex-col gap-3 p-4 transition hover:border-slate-300 hover:shadow-pop')}
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
