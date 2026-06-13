import { usePortalInquilino } from '../../contexts/PortalInquilinoContext'

const formatFecha = (fechaStr) => {
  if (!fechaStr) return '—'
  const [year, month, day] = fechaStr.split('-')
  return `${day}/${month}/${year}`
}

const formatMonto = (monto) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto)

const tipoAjusteLabel = {
  icl: 'ICL (Índice Casa Propia)',
  ipc: 'IPC (Nivel General)',
  porcentaje_fijo: 'Porcentaje fijo',
  manual: 'Manual',
}

function InfoFila({ label, value, destacado = false }) {
  return (
    <li className="flex items-center justify-between gap-4 px-5 py-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span
        className={`text-right text-sm ${
          destacado ? 'font-semibold text-amber-700' : 'font-medium text-slate-800'
        }`}
      >
        {value ?? '—'}
      </span>
    </li>
  )
}

export default function InquilinoDocumentos() {
  const { contratos, inquilino, loading, error } = usePortalInquilino()

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-slate-500">Cargando documentación...</p>
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

  const contrato = contratos[0] ?? null

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-slate-800">Mi Contrato</h2>

      {!contrato ? (
        <div className="rounded-2xl bg-white px-5 py-10 text-center shadow-sm ring-1 ring-slate-100">
          <p className="text-sm font-medium text-slate-600">No tenés un contrato activo actualmente.</p>
          <p className="mt-1 text-xs text-slate-400">Contactá a la inmobiliaria para más información.</p>
        </div>
      ) : (
        <>
          {/* Contract detail card */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
            <div className="bg-indigo-600 px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-indigo-200">
                Contrato vigente
              </p>
              <p className="mt-1 text-base font-semibold text-white">
                {contrato.propiedades?.direccion ?? '—'}
              </p>
              <p className="text-xs text-indigo-300">{contrato.propiedades?.tipo}</p>
            </div>

            <ul className="divide-y divide-slate-100">
              <InfoFila label="Inicio" value={formatFecha(contrato.fecha_inicio)} />
              <InfoFila label="Vencimiento" value={formatFecha(contrato.fecha_fin)} />
              <InfoFila label="Monto mensual" value={formatMonto(contrato.monto_alquiler)} />
              <InfoFila label="Monto inicial" value={formatMonto(contrato.monto_inicial)} />
              <InfoFila
                label="Tipo de ajuste"
                value={tipoAjusteLabel[contrato.tipo_ajuste] ?? contrato.tipo_ajuste}
              />
              <InfoFila
                label="Periodicidad"
                value={
                  contrato.periodicidad_meses
                    ? `Cada ${contrato.periodicidad_meses} mes${contrato.periodicidad_meses > 1 ? 'es' : ''}`
                    : null
                }
              />
              {contrato.fecha_proximo_aumento && (
                <InfoFila
                  label="Próximo aumento"
                  value={formatFecha(contrato.fecha_proximo_aumento)}
                  destacado
                />
              )}
              {contrato.dia_vencimiento && (
                <InfoFila
                  label="Vence el día"
                  value={`${contrato.dia_vencimiento} de cada mes`}
                />
              )}
              {contrato.observaciones && (
                <InfoFila label="Observaciones" value={contrato.observaciones} />
              )}
            </ul>
          </div>

          {/* Tenant data card */}
          {inquilino && (
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
              <div className="border-b border-slate-100 px-5 py-4">
                <p className="text-sm font-semibold text-slate-800">Mis datos</p>
              </div>
              <ul className="divide-y divide-slate-100">
                <InfoFila label="Nombre" value={inquilino.nombre_completo} />
                <InfoFila label="DNI / CUIT" value={inquilino.dni_cuit} />
                <InfoFila label="Teléfono" value={inquilino.telefono} />
              </ul>
            </div>
          )}

          {/* Documents placeholder */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
            <div className="border-b border-slate-100 px-5 py-4">
              <p className="text-sm font-semibold text-slate-800">Documentación adjunta</p>
            </div>
            <div className="px-5 py-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                <svg
                  className="h-6 w-6 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                  />
                </svg>
              </div>
              <p className="text-sm text-slate-500">
                La descarga de documentos adjuntos (contrato, DNI, recibos)
              </p>
              <p className="text-sm text-slate-500">será habilitada próximamente.</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
