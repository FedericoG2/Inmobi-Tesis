import DashboardAlertPanel, { DashboardInboxItem } from '../../components/admin/DashboardAlertPanel'
import DashboardQuickActions from '../../components/admin/DashboardQuickActions'
import IpcBarChart from '../../components/admin/IpcBarChart'
import StatCard from '../../components/admin/StatCard'
import { useDashboard } from '../../hooks/useDashboard'
import { capitalizar } from '../../utils/aumentosUi'
import {
  badgeClass,
  calloutClass,
  loadingStateClass,
  pageSubtitle,
  pageTitle,
  sectionHint,
  sectionTitle,
  surfaceCard,
} from '../../utils/ui'

function formatFecha(fecha) {
  if (!fecha) return '—'
  const [year, month, day] = fecha.split('-')
  return `${day}/${month}/${year}`
}

function formatMontoCompacto(monto) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto || 0)
}

function etiquetaDiasRestantes(dias) {
  if (dias === 0) return 'Hoy'
  if (dias === 1) return '1 día'
  return `${dias} días`
}

function fechaHoyLegible() {
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
}

export default function AdminDashboard() {
  const {
    kpis,
    reclamosPendientes,
    contratosPorVencer,
    ingresoMensual,
    aumentosPeriodo,
    ipcAnual,
    ipcAnio,
    ipcError,
    loading,
    error,
  } = useDashboard()

  if (loading) {
    return (
      <div className={loadingStateClass}>
        <p>Cargando resumen operativo…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={calloutClass('danger')}>{error}</div>
    )
  }

  const alertasPendientes =
    (kpis?.reclamos_pendientes ?? 0) + (kpis?.contratos_por_vencer_90d ?? 0)

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm capitalize text-slate-500">{fechaHoyLegible()}</p>
          <h1 className={`${pageTitle} mt-0.5`}>Dashboard</h1>
          <p className={pageSubtitle}>
            Resumen operativo · {alertasPendientes} alerta{alertasPendientes === 1 ? '' : 's'} activa
            {alertasPendientes === 1 ? '' : 's'}
          </p>
        </div>
        <DashboardQuickActions />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard
          compact
          label="Propiedades"
          value={kpis?.total_propiedades ?? 0}
          icon="building"
          theme="slate"
        />
        <StatCard
          compact
          label="Contratos activos"
          value={kpis?.contratos_activos ?? 0}
          icon="clipboard"
          theme="slate"
        />
        <StatCard
          compact
          label="Contratos por vencer"
          value={kpis?.contratos_por_vencer_90d ?? 0}
          icon="calendar"
          theme="slate"
          hint="Próx. 90 días"
        />
        <StatCard
          compact
          label={`Aumentos ${capitalizar(aumentosPeriodo?.nombre ?? '')}`.trim()}
          value={aumentosPeriodo?.cantidad ?? 0}
          icon="trending"
          theme="slate"
          hint="Próximo período"
        />
        <StatCard
          compact
          label="Reclamos"
          value={kpis?.reclamos_pendientes ?? 0}
          hint="Pendientes de gestión"
          icon="wrench"
          theme={(kpis?.reclamos_pendientes ?? 0) > 0 ? 'red' : 'slate'}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-12 xl:items-stretch">
        <div className="flex flex-col gap-4 xl:col-span-5">
          <div className={`${surfaceCard} p-5`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className={sectionTitle}>Ingreso mensual estimado</p>
                <p className={sectionHint}>Suma de alquileres activos</p>
              </div>
              <span className={badgeClass('success')}>Activo</span>
            </div>
            <p className="mt-4 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">
              {formatMontoCompacto(ingresoMensual)}
            </p>
          </div>

          <DashboardAlertPanel
            compact
            icon="wrench"
            titulo="Reclamos pendientes"
            cantidad={kpis?.reclamos_pendientes ?? 0}
            linkTo="/admin/reclamos"
            linkLabel="Ir a Reclamos"
            vacio={reclamosPendientes.length === 0}
            vacioMensaje="No hay reclamos pendientes."
            tono="red"
          >
            {reclamosPendientes.map((item) => (
              <DashboardInboxItem
                compact
                key={item.reclamo_id}
                titulo={item.titulo}
                subtitulo={`${item.inquilino_nombre} · ${item.propiedad_direccion}`}
                badgeTono="red"
              />
            ))}
          </DashboardAlertPanel>

          <DashboardAlertPanel
            compact
            icon="calendar"
            titulo="Contratos por vencer (90 días)"
            cantidad={kpis?.contratos_por_vencer_90d ?? 0}
            linkTo="/admin/contratos"
            linkLabel="Ver contratos"
            vacio={contratosPorVencer.length === 0}
            vacioMensaje="No hay contratos por vencer en 90 días."
            tono="slate"
          >
            {contratosPorVencer.map((item) => (
              <DashboardInboxItem
                compact
                key={item.contrato_id}
                titulo={item.inquilino_nombre}
                subtitulo={`${item.propiedad_direccion} · vence ${formatFecha(item.fecha_fin)}`}
                badge={etiquetaDiasRestantes(item.dias_restantes)}
                badgeTono="slate"
              />
            ))}
          </DashboardAlertPanel>
        </div>

        <div className="xl:col-span-7">
          <div className={`${surfaceCard} flex h-full min-h-[22rem] flex-col p-5`}>
            <p className={sectionTitle}>Evolución IPC {ipcAnio}</p>
            <p className={sectionHint}>
              Variación mensual · Fuente Argly
              {ipcAnual.at(-1)?.mes ? ` · hasta ${ipcAnual.at(-1).mes}` : ''}
            </p>
            <div className="mt-4 min-h-0 flex-1">
              {ipcError ? (
                <p className="mt-4 text-sm text-slate-600">
                  No se pudo cargar el IPC ({ipcError}).
                </p>
              ) : ipcAnual.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">Sin datos de IPC para {ipcAnio}.</p>
              ) : (
                <IpcBarChart data={ipcAnual} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
