import { Grid, Title } from '@tremor/react'
import DashboardAlertPanel, { DashboardInboxItem } from '../../components/admin/DashboardAlertPanel'
import IpcBarChart from '../../components/admin/IpcBarChart'
import StatCard from '../../components/admin/StatCard'
import { useDashboard } from '../../hooks/useDashboard'

function formatFecha(fecha) {
  if (!fecha) return '—'
  const [year, month, day] = fecha.split('-')
  return `${day}/${month}/${year}`
}

function etiquetaDiasAumento(dias) {
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'En 1 día'
  return `En ${dias} días`
}

export default function AdminDashboard() {
  const { kpis, aumentosProximos, reclamosUrgentes, ipcAnual, ipcAnio, ipcError, loading, error } =
    useDashboard()

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-slate-500">Cargando resumen operativo...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Title>Dashboard</Title>
        <p className="mt-1 text-sm text-slate-500">Resumen operativo de la cartera inmobiliaria</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Propiedades totales"
          value={kpis?.total_propiedades ?? 0}
          icon="building"
          theme="indigo"
        />
        <StatCard
          label="Ocupación"
          value={`${kpis?.porcentaje_ocupacion ?? 0}%`}
          icon="chart"
          theme="emerald"
        />
        <StatCard
          label="Contratos activos"
          value={kpis?.contratos_activos ?? 0}
          icon="clipboard"
          theme="sky"
        />
        <StatCard
          label="Reclamos pendientes"
          value={kpis?.reclamos_pendientes ?? 0}
          icon="wrench"
          theme="amber"
        />
        <StatCard
          label="Contratos por vencer"
          value={kpis?.contratos_por_vencer_90d ?? 0}
          icon="calendar"
          theme="violet"
        />
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <Title className="text-slate-800">Evolución IPC {ipcAnio}</Title>
        <p className="mt-1 text-xs text-slate-500">
          Variación mensual del Índice de Precios al Consumidor (Nivel General) · Fuente Argly
        </p>
        {ipcError ? (
          <p className="mt-8 text-sm text-amber-700">
            No se pudo cargar el IPC desde Argly ({ipcError}).
          </p>
        ) : ipcAnual.length === 0 ? (
          <p className="mt-8 text-sm text-slate-500">
            No hay datos de IPC publicados en Argly para {ipcAnio}.
          </p>
        ) : (
          <IpcBarChart data={ipcAnual} />
        )}
      </div>

      <Grid numItemsSm={1} numItemsLg={2} className="gap-4">
        <DashboardAlertPanel
          titulo="Contratos con Próximo Aumento"
          cantidad={kpis?.contratos_aumento_30d ?? 0}
          linkTo="/admin/aumentos"
          linkLabel="Ir a Aumentos"
          vacio={aumentosProximos.length === 0}
          vacioMensaje="No hay aumentos programados en los próximos 30 días."
          tono="amber"
        >
          {aumentosProximos.map((item) => (
            <DashboardInboxItem
              key={item.contrato_id}
              titulo={item.inquilino_nombre}
              subtitulo={`${item.propiedad_direccion} · ${formatFecha(item.fecha_proximo_aumento)}`}
              badge={etiquetaDiasAumento(item.dias_hasta_aumento)}
              badgeTono="amber"
            />
          ))}
        </DashboardAlertPanel>

        <DashboardAlertPanel
          titulo="Reclamos Urgentes"
          cantidad={kpis?.reclamos_urgentes ?? 0}
          linkTo="/admin/reclamos"
          linkLabel="Ir a Reclamos"
          vacio={reclamosUrgentes.length === 0}
          vacioMensaje="No hay reclamos urgentes abiertos."
          tono="red"
        >
          {reclamosUrgentes.map((item) => (
            <DashboardInboxItem
              key={item.reclamo_id}
              titulo={item.titulo}
              subtitulo={`${item.inquilino_nombre} · ${item.propiedad_direccion}`}
              badge={item.estado}
              badgeTono="red"
            />
          ))}
        </DashboardAlertPanel>
      </Grid>
    </div>
  )
}
