import DashboardAlertPanel, { DashboardInboxItem } from '../../components/admin/DashboardAlertPanel'
import DashboardPropertiesSummary from '../../components/admin/DashboardPropertiesSummary'
import DashboardQuickActions from '../../components/admin/DashboardQuickActions'
import IpcBarChart from '../../components/admin/IpcBarChart'
import StatCard from '../../components/admin/StatCard'
import { useDashboard } from '../../hooks/useDashboard'

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

function etiquetaDiasAumento(dias) {
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'En 1 día'
  return `En ${dias} días`
}

function etiquetaDiasVencido(dias) {
  if (dias === 0) return 'Hoy'
  if (dias === 1) return '1 día'
  return `${dias} días`
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
    aumentosProximos,
    aumentosVencidos,
    reclamosUrgentes,
    contratosPorVencer,
    propiedadesPorEstado,
    ingresoMensual,
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
    (kpis?.aumentos_vencidos ?? 0) +
    (kpis?.reclamos_urgentes ?? 0) +
    (kpis?.contratos_por_vencer_90d ?? 0)

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

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard
          compact
          label="Propiedades"
          value={kpis?.total_propiedades ?? 0}
          icon="building"
          theme="slate"
        />
        <StatCard
          compact
          label="Ocupación"
          value={`${kpis?.porcentaje_ocupacion ?? 0}%`}
          icon="chart"
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
          label="Reclamos pend."
          value={kpis?.reclamos_pendientes ?? 0}
          icon="wrench"
          theme={(kpis?.reclamos_pendientes ?? 0) > 0 ? 'red' : 'slate'}
        />
        <StatCard
          compact
          label="Aumentos vencidos"
          value={kpis?.aumentos_vencidos ?? 0}
          icon="alert"
          theme={(kpis?.aumentos_vencidos ?? 0) > 0 ? 'red' : 'slate'}
          hint="Sin confirmar"
        />
        <StatCard
          compact
          label="Contratos por vencer"
          value={kpis?.contratos_por_vencer_90d ?? 0}
          icon="calendar"
          theme="slate"
          hint="Próx. 90 días"
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-12">
        <div className="space-y-3 xl:col-span-4">
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

          <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
            <p className="text-xs font-semibold text-slate-900">Cartera por estado</p>
            <div className="mt-2">
              <DashboardPropertiesSummary propiedadesPorEstado={propiedadesPorEstado} />
            </div>
          </div>

          <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
            <p className="text-xs font-semibold text-slate-900">Evolución IPC {ipcAnio}</p>
            <p className="mt-0.5 text-[10px] text-slate-500">Variación mensual · Fuente Argly</p>
            {ipcError ? (
              <p className="mt-4 text-xs text-slate-600">
                No se pudo cargar el IPC ({ipcError}).
              </p>
            ) : ipcAnual.length === 0 ? (
              <p className="mt-4 text-xs text-slate-500">Sin datos de IPC para {ipcAnio}.</p>
            ) : (
              <IpcBarChart data={ipcAnual} height={160} />
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:col-span-8">
          <DashboardAlertPanel
            compact
            titulo="Aumentos vencidos sin confirmar"
            cantidad={kpis?.aumentos_vencidos ?? 0}
            linkTo="/admin/aumentos"
            linkLabel="Gestionar aumentos"
            vacio={aumentosVencidos.length === 0}
            vacioMensaje="No hay aumentos vencidos pendientes."
            tono="red"
          >
            {aumentosVencidos.map((item) => (
              <DashboardInboxItem
                compact
                key={item.contrato_id}
                titulo={item.inquilino_nombre}
                subtitulo={`${item.propiedad_direccion} · venció ${formatFecha(item.fecha_proximo_aumento)}`}
                badge={`${etiquetaDiasVencido(item.dias_vencido)} atrás`}
                badgeTono="red"
              />
            ))}
          </DashboardAlertPanel>

          <DashboardAlertPanel
            compact
            titulo="Próximos aumentos (30 días)"
            cantidad={kpis?.contratos_aumento_30d ?? 0}
            linkTo="/admin/aumentos"
            linkLabel="Ver calendario"
            vacio={aumentosProximos.length === 0}
            vacioMensaje="No hay aumentos en los próximos 30 días."
            tono="indigo"
          >
            {aumentosProximos.map((item) => (
              <DashboardInboxItem
                compact
                key={item.contrato_id}
                titulo={item.inquilino_nombre}
                subtitulo={`${item.propiedad_direccion} · ${formatFecha(item.fecha_proximo_aumento)}`}
                badge={etiquetaDiasAumento(item.dias_hasta_aumento)}
                badgeTono="indigo"
              />
            ))}
          </DashboardAlertPanel>

          <DashboardAlertPanel
            compact
            titulo="Reclamos urgentes"
            cantidad={kpis?.reclamos_urgentes ?? 0}
            linkTo="/admin/reclamos"
            linkLabel="Ir a Reclamos"
            vacio={reclamosUrgentes.length === 0}
            vacioMensaje="No hay reclamos urgentes abiertos."
            tono="red"
          >
            {reclamosUrgentes.map((item) => (
              <DashboardInboxItem
                compact
                key={item.reclamo_id}
                titulo={item.titulo}
                subtitulo={`${item.inquilino_nombre} · ${item.propiedad_direccion}`}
                badge={item.estado}
                badgeTono="red"
              />
            ))}
          </DashboardAlertPanel>

          <DashboardAlertPanel
            compact
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
                subtitulo={`${item.propiedad_direccion} · fin ${formatFecha(item.fecha_fin)}`}
                badge={etiquetaDiasRestantes(item.dias_restantes)}
                badgeTono="slate"
              />
            ))}
          </DashboardAlertPanel>
        </div>
      </div>
    </div>
  )
}
