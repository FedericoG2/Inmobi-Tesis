import { useEffect, useMemo, useState } from 'react'
import { IconDocument } from '../../components/icons/NavIcons'
import { usePortalInquilino } from '../../contexts/PortalInquilinoContext'
import {
  descargarDocumentoPortal,
  etiquetaTipoArchivo,
  listarDocumentosPortalContrato,
} from '../../services/portalInquilinoService'
import { armarResumenAlquilerInquilino } from '../../utils/resumenAlquilerInquilino'

const CARD_CLASS = 'rounded-2xl bg-white ring-1 ring-slate-100'
const SECTION_TITLE = 'text-base font-bold text-slate-900'

const formatFecha = (fechaStr) => {
  if (!fechaStr) return '—'
  const [year, month, day] = fechaStr.split('-')
  return `${day}/${month}/${year}`
}

const formatMonto = (monto) => {
  if (monto == null || monto === '') return '—'
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(monto))
}

const tipoAjusteLabel = {
  icl: 'ICL (Índice Casa Propia)',
  ipc: 'IPC (Nivel General)',
  porcentaje_fijo: 'Porcentaje fijo',
  manual: 'Manual',
}

function IconAlertInfo({ className = '' }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 ${className}`.trim()}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
      />
    </svg>
  )
}

function InfoGrupo({ titulo, children }) {
  return (
    <div>
      <p className="px-5 pt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {titulo}
      </p>
      <ul className="divide-y divide-slate-100">{children}</ul>
    </div>
  )
}

function InfoFila({ label, value }) {
  return (
    <li className="flex items-center justify-between gap-4 px-5 py-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-medium text-slate-800">{value ?? '—'}</span>
    </li>
  )
}

export default function InquilinoDocumentos() {
  const { contratoActivo, loading, error } = usePortalInquilino()
  const [documentos, setDocumentos] = useState([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [docsError, setDocsError] = useState(null)
  const [descargandoId, setDescargandoId] = useState(null)

  const contrato = contratoActivo

  const resumen = useMemo(() => armarResumenAlquilerInquilino(contrato), [contrato])

  const progresoContrato =
    resumen?.mesContratoActual != null && resumen?.mesContratoTotal
      ? Math.round((resumen.mesContratoActual / resumen.mesContratoTotal) * 100)
      : null

  const vigenciaLinea = contrato
    ? [
        `${formatFecha(contrato.fecha_inicio)} – ${formatFecha(contrato.fecha_fin)}`,
        contrato.dia_vencimiento ? `Vence el día ${contrato.dia_vencimiento}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : null

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

  const formatFechaDoc = (fecha) => {
    if (!fecha) return '—'
    const iso = fecha.includes('T') ? fecha.split('T')[0] : fecha
    const [year, month, day] = iso.split('-')
    return `${day}/${month}/${year}`
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-slate-500">Cargando tu Contrato...</p>
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

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Tu Contrato</h1>

      {!contrato || !resumen ? (
        <div className={`${CARD_CLASS} px-5 py-10 text-center`}>
          <p className="text-sm font-medium text-slate-600">No tenés un Contrato activo actualmente.</p>
          <p className="mt-1 text-xs text-slate-400">Contactá a la inmobiliaria para más información.</p>
        </div>
      ) : (
        <>
          <p className="-mt-2 text-sm text-slate-500">
            {contrato.propiedades?.direccion ?? '—'}
            {contrato.propiedades?.tipo ? ` · ${contrato.propiedades.tipo}` : ''}
          </p>

          <section className="space-y-3">
            <h2 className={SECTION_TITLE}>Resumen</h2>

            <div className={`${CARD_CLASS} px-5 py-5`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-500">Alquiler mensual</p>
                {resumen.mesContratoCorto && (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                    {resumen.mesContratoCorto}
                  </span>
                )}
              </div>

              <p className="mt-1 text-[1.75rem] font-bold leading-tight tracking-tight text-slate-900">
                {formatMonto(contrato.monto_alquiler)}
              </p>

              <p className="mt-1 text-sm text-slate-500">{vigenciaLinea}</p>

              {progresoContrato != null && (
                <div className="mt-4">
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all"
                      style={{ width: `${progresoContrato}%` }}
                    />
                  </div>
                </div>
              )}

              {resumen.hayAumentoEnPeriodo && resumen.aumentoMesNombre && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-2.5 py-2 ring-1 ring-amber-200/80">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                      <IconAlertInfo />
                    </div>
                    <p className="min-w-0 flex-1 text-xs leading-tight text-slate-800">
                      <span className="font-semibold text-amber-900">
                        Aumento en {resumen.aumentoMesNombre}.
                      </span>{' '}
                      Monto a confirmar con la inmobiliaria.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className={SECTION_TITLE}>Condiciones</h2>

            <div className={`${CARD_CLASS} overflow-hidden`}>
              <InfoGrupo titulo="Montos">
                <InfoFila label="Monto inicial" value={formatMonto(contrato.monto_inicial)} />
              </InfoGrupo>

              <InfoGrupo titulo="Ajustes">
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
                  />
                )}
              </InfoGrupo>

              {contrato.observaciones && (
                <InfoGrupo titulo="Observaciones">
                  <li className="px-5 py-3">
                    <p className="text-sm leading-relaxed text-slate-700">{contrato.observaciones}</p>
                  </li>
                </InfoGrupo>
              )}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className={SECTION_TITLE}>Documentación</h2>

            {docsLoading ? (
              <div className={`${CARD_CLASS} px-5 py-8 text-center text-sm text-slate-500`}>
                Cargando documentos...
              </div>
            ) : docsError ? (
              <div className={`${CARD_CLASS} px-5 py-6 text-center text-sm text-red-600`}>
                {docsError}
              </div>
            ) : documentos.length === 0 ? (
              <div className={`${CARD_CLASS} px-5 py-8 text-center`}>
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                  <IconDocument className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm text-slate-500">
                  Todavía no hay documentos compartidos para tu Contrato.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {documentos.map((documento) => (
                  <button
                    key={documento.id}
                    type="button"
                    onClick={() => handleDescargar(documento)}
                    disabled={descargandoId === documento.id}
                    className={`${CARD_CLASS} flex w-full items-center gap-3 p-4 text-left transition hover:ring-indigo-200 disabled:opacity-60`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                      <IconDocument />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{documento.nombre}</p>
                      <p className="text-xs text-slate-500">
                        {etiquetaTipoArchivo(documento.nombre)} · {formatFechaDoc(documento.fecha_subida)}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-indigo-600">
                      {descargandoId === documento.id ? 'Abriendo...' : 'Descargar'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
