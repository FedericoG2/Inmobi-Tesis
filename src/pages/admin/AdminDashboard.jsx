import DashboardAlertPanel, { DashboardInboxItem } from '../../components/admin/DashboardAlertPanel'
import DashboardQuickActions from '../../components/admin/DashboardQuickActions'
import IpcBarChart from '../../components/admin/IpcBarChart'
import StatCard from '../../components/admin/StatCard'
import { useDashboard } from '../../hooks/useDashboard'
import { capitalizar } from '../../utils/aumentosUi'

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
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-slate-500">Cargando resumen operativo...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
    )
  }

  const alertasPendientes =
    (kpis?.reclamos_pendientes ?? 0) + (kpis?.contratos_por_vencer_60d ?? 0)

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-lg font-bold tracking-tight text-slate-900">Dashboard</h1>
            <span className="text-xs capitalize text-slate-500">{fechaHoyLegible()}</span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Resumen operativo · {alertasPendientes} alerta{alertasPendientes === 1 ? '' : 's'} activa
            {alertasPendientes === 1 ? '' : 's'}
          </p>
        </div>
        <DashboardQuickActions />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
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
          value={kpis?.contratos_por_vencer_60d ?? 0}
          icon="calendar"
          theme="slate"
          hint="Próx. 60 días"
        />
        <StatCard
          compact
          label={`Aumentos ${capitalizar(aumentosPeriodo?.nombre ?? '')}`.trim()}
          value={aumentosPeriodo?.cantidad ?? 0}
          icon="alert"
          theme="slate"
          hint="Próximo período"
        />
        <StatCard
          compact
          label="Reclamos pend."
          value={kpis?.reclamos_pendientes ?? 0}
          icon="wrench"
          theme={(kpis?.reclamos_pendientes ?? 0) > 0 ? 'red' : 'slate'}
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-12 xl:items-stretch">
        <div className="flex flex-col gap-3 xl:col-span-5">
          <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-slate-900">Ingreso mensual estimado</p>
                <p className="mt-0.5 text-[10px] text-slate-500">Suma de alquileres activos</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-slate-200">
                Activo
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
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
            titulo="Contratos por vencer (60 días)"
            cantidad={kpis?.contratos_por_vencer_60d ?? 0}
            linkTo="/admin/contratos"
            linkLabel="Ver contratos"
            vacio={contratosPorVencer.length === 0}
            vacioMensaje="No hay contratos por vencer en 60 días."
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
          <div className="flex h-full min-h-[22rem] flex-col rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <p className="text-sm font-semibold text-slate-900">Evolución IPC {ipcAnio}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Variación mensual · Fuente Argly
              {ipcAnual.at(-1)?.mes ? ` · hasta ${ipcAnual.at(-1).mes}` : ''}
            </p>
            <div className="mt-3 min-h-0 flex-1">
              {ipcError ? (
                <p className="mt-4 text-xs text-slate-600">
                  No se pudo cargar el IPC ({ipcError}).
                </p>
              ) : ipcAnual.length === 0 ? (
                <p className="mt-4 text-xs text-slate-500">Sin datos de IPC para {ipcAnio}.</p>
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
