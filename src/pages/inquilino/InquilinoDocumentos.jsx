import { useEffect, useMemo, useState } from 'react'
import ProyeccionAumentoInquilinoCard from '../../components/inquilino/ProyeccionAumentoInquilinoCard'
import { VigenciaContratoChips } from '../../components/inquilino/ContratoFechasResumen'
import HistorialMontosInquilino from '../../components/inquilino/HistorialMontosInquilino'
import { IconDocument } from '../../components/icons/NavIcons'
import useProyeccionAumentoInquilino from '../../hooks/useProyeccionAumentoInquilino'
import { usePortalInquilino } from '../../contexts/PortalInquilinoContext'
import {
  descargarDocumentoPortal,
  etiquetaTipoArchivo,
  listarDocumentosPortalContrato,
} from '../../services/portalInquilinoService'
import { armarResumenAlquilerInquilino } from '../../utils/resumenAlquilerInquilino'
import { armarHistorialMontosContrato } from '../../utils/historialMontosInquilino'

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

  const historialMontos = useMemo(() => armarHistorialMontosContrato(contrato), [contrato])

  const { propuesta, loading: proyeccionLoading, error: proyeccionError } =
    useProyeccionAumentoInquilino(contrato, resumen)

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

              <VigenciaContratoChips
                fechaInicio={contrato.fecha_inicio}
                fechaFin={contrato.fecha_fin}
                diaVencimiento={contrato.dia_vencimiento}
                formatFecha={formatFecha}
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
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5V18h1.5M3 12V13.5h1.5M3 7.5V9H4.5M7.5 6h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="m9 14 2 2 4-4" />
                </svg>
              </span>
              <h2 className={SECTION_TITLE}>Historial de montos</h2>
            </div>
            <HistorialMontosInquilino filas={historialMontos} />
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
