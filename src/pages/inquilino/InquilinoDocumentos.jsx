import { useEffect, useState } from 'react'
import { usePortalInquilino } from '../../contexts/PortalInquilinoContext'
import {
  descargarDocumentoPortal,
  etiquetaTipoArchivo,
  listarDocumentosPortalContrato,
} from '../../services/portalInquilinoService'

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
  const { contratoActivo, inquilino, loading, error } = usePortalInquilino()
  const [documentos, setDocumentos] = useState([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [docsError, setDocsError] = useState(null)
  const [descargandoId, setDescargandoId] = useState(null)

  const contrato = contratoActivo

  useEffect(() => {
    if (!contrato?.id) {
      setDocumentos([])
      return undefined
    }

    let activo = true
    setDocsLoading(true)
    setDocsError(null)

    listarDocumentosPortalContrato(contrato.id).then(({ data, error: err }) => {
      if (!activo) return
      setDocsLoading(false)
      if (err) {
        setDocsError(err.message ?? 'No se pudieron cargar los documentos')
        setDocumentos([])
        return
      }
      setDocumentos(data ?? [])
    })

    return () => {
      activo = false
    }
  }, [contrato?.id])

  const handleDescargar = async (documento) => {
    setDescargandoId(documento.id)
    setDocsError(null)
    const { data, error: err } = await descargarDocumentoPortal(documento.url_archivo)
    setDescargandoId(null)
    if (err || !data?.signedUrl) {
      setDocsError(err?.message ?? 'No se pudo descargar el archivo')
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

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

  const formatFechaDoc = (fecha) => {
    if (!fecha) return '—'
    const iso = fecha.includes('T') ? fecha.split('T')[0] : fecha
    const [year, month, day] = iso.split('-')
    return `${day}/${month}/${year}`
  }

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

          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
            <div className="border-b border-slate-100 px-5 py-4">
              <p className="text-sm font-semibold text-slate-800">Documentación adjunta</p>
            </div>
            {docsLoading ? (
              <div className="px-5 py-8 text-center text-sm text-slate-500">Cargando documentos...</div>
            ) : docsError ? (
              <div className="px-5 py-6 text-center text-sm text-red-600">{docsError}</div>
            ) : documentos.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-slate-500">
                  Todavía no hay documentos compartidos para tu contrato.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {documentos.map((documento) => (
                  <li key={documento.id} className="flex items-center justify-between gap-3 px-5 py-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{documento.nombre}</p>
                      <p className="text-xs text-slate-500">
                        {etiquetaTipoArchivo(documento.nombre)} · {formatFechaDoc(documento.fecha_subida)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDescargar(documento)}
                      disabled={descargandoId === documento.id}
                      className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {descargandoId === documento.id ? 'Abriendo...' : 'Descargar'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
