import { Grid, Title } from '@tremor/react'
import { Link } from 'react-router-dom'
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

function etiquetaDiasVencido(dias) {
  if (dias === 1) return 'hace 1 día'
  return `hace ${dias} días`
}

function IconAlerta({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
      />
    </svg>
  )
}

export default function AdminDashboard() {
  const {
    kpis,
    aumentosProximos,
    aumentosVencidos,
    reclamosUrgentes,
    ipcAnual,
    ipcAnio,
    ipcError,
    loading,
    error,
  } = useDashboard()

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

      {(kpis?.aumentos_vencidos ?? 0) > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <IconAlerta />
              </span>
              <div>
                <p className="text-sm font-bold text-red-800">
                  {kpis.aumentos_vencidos} aumento{kpis.aumentos_vencidos > 1 ? 's' : ''} vencido
                  {kpis.aumentos_vencidos > 1 ? 's' : ''} sin confirmar
                </p>
                <p className="mt-0.5 text-xs text-red-700/90">
                  Pasó la fecha del ajuste y todavía no se confirmó. Revisalos para no atrasar el
                  alquiler.
                </p>
              </div>
            </div>
            <Link
              to="/admin/aumentos"
              className="shrink-0 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
            >
              Revisar aumentos
            </Link>
          </div>

          {aumentosVencidos.length > 0 && (
            <ul className="mt-3 space-y-1.5 border-t border-red-200/70 pt-3">
              {aumentosVencidos.map((item) => (
                <li
                  key={item.contrato_id}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <span className="min-w-0 truncate text-red-900">
                    <span className="font-medium">{item.inquilino_nombre}</span>
                    <span className="text-red-700/80"> · {item.propiedad_direccion}</span>
                  </span>
                  <span className="shrink-0 font-medium text-red-700">
                    {formatFecha(item.fecha_proximo_aumento)} · vencido {etiquetaDiasVencido(item.dias_vencido)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

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
