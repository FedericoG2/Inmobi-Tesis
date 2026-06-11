import { Link } from 'react-router-dom'
import { usePortalInquilino } from '../../contexts/PortalInquilinoContext'

const formatMonto = (monto) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto)

const formatFecha = (fechaStr) => {
  if (!fechaStr) return '—'
  const [year, month, day] = fechaStr.split('-')
  return `${day}/${month}/${year}`
}

function calcularDiasRestantes(fechaFin) {
  if (!fechaFin) return null
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const fin = new Date(fechaFin)
  fin.setHours(0, 0, 0, 0)
  return Math.round((fin - hoy) / (1000 * 60 * 60 * 24))
}

function IconWrench() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l5.654-4.654m5.292-8.93a3 3 0 0 1 4.243 4.242M5.196 5.196l13.608 13.608" />
    </svg>
  )
}

function IconDocument() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  )
}

function IconChevron() {
  return (
    <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  )
}

export default function InquilinoDashboard() {
  const { inquilino, contratos, reclamos, loading, error } = usePortalInquilino()

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

  const primerNombre = inquilino?.nombre_completo?.split(' ')[0] ?? 'Inquilino'
  const contratoActivo = contratos[0] ?? null
  const dias = calcularDiasRestantes(contratoActivo?.fecha_fin)
  const reclamosPendientes = reclamos.filter((r) => r.estado === 'Pendiente').length
  const diasCriticos = dias !== null && dias <= 60

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">¡Hola, {primerNombre}!</h1>
        <p className="mt-0.5 text-sm text-slate-500">¿Qué tenemos para hoy?</p>
      </div>

      {/* Contract card */}
      {!contratoActivo ? (
        <div className="rounded-2xl bg-white px-5 py-8 text-center shadow-sm ring-1 ring-slate-100">
          <p className="text-sm font-medium text-slate-600">No tenés un contrato activo actualmente.</p>
          <p className="mt-1 text-xs text-slate-400">Contactá a la inmobiliaria para más información.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
          <div className="bg-indigo-600 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-200">
              Propiedad actual
            </p>
            <p className="mt-1 text-base font-semibold text-white">
              {contratoActivo.propiedades?.direccion ?? '—'}
            </p>
            <p className="text-xs text-indigo-300">{contratoActivo.propiedades?.tipo}</p>
          </div>

          <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
            <div className="p-5">
              <p className="text-xs text-slate-500">Monto mensual</p>
              <p className="mt-1 text-lg font-bold text-slate-800">
                {formatMonto(contratoActivo.monto_alquiler)}
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs text-slate-500">Días restantes</p>
              <p className={`mt-1 text-2xl font-bold ${diasCriticos ? 'text-amber-600' : 'text-indigo-600'}`}>
                {dias !== null ? Math.max(0, dias) : '—'}
              </p>
            </div>
          </div>

          <ul className="divide-y divide-slate-100">
            <li className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-slate-500">Vigencia</span>
              <span className="text-sm font-medium text-slate-700">
                {formatFecha(contratoActivo.fecha_inicio)} — {formatFecha(contratoActivo.fecha_fin)}
              </span>
            </li>
            {contratoActivo.fecha_proximo_aumento && (
              <li className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-slate-500">Próximo aumento</span>
                <span className="text-sm font-semibold text-amber-700">
                  {formatFecha(contratoActivo.fecha_proximo_aumento)}
                </span>
              </li>
            )}
            {contratoActivo.dia_vencimiento && (
              <li className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-slate-500">Vence el día</span>
                <span className="text-sm font-medium text-slate-700">
                  {contratoActivo.dia_vencimiento} de cada mes
                </span>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Quick access cards */}
      <div className="space-y-3">
        <Link
          to="/inquilino/reclamos"
          className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 transition hover:ring-indigo-200"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <IconWrench />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-800">Mis Reclamos</p>
            <p className="text-xs text-slate-500">
              {reclamosPendientes > 0
                ? `${reclamosPendientes} pendiente${reclamosPendientes > 1 ? 's' : ''} · Reportá un problema`
                : 'Reportá un problema de mantenimiento'}
            </p>
          </div>
          {reclamosPendientes > 0 && (
            <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
              {reclamosPendientes}
            </span>
          )}
          <IconChevron />
        </Link>

        <Link
          to="/inquilino/documentos"
          className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 transition hover:ring-indigo-200"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
            <IconDocument />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-800">Mi Contrato</p>
            <p className="text-xs text-slate-500">Consultá los detalles de tu alquiler</p>
          </div>
          <IconChevron />
        </Link>
      </div>
    </div>
  )
}
