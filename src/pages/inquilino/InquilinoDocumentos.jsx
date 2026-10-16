import { useEffect, useMemo, useState } from 'react'
import ProyeccionAumentoInquilinoCard from '../../components/inquilino/ProyeccionAumentoInquilinoCard'
import { VigenciaContratoChips } from '../../components/inquilino/ContratoFechasResumen'
import HistorialMontosInquilino from '../../components/inquilino/HistorialMontosInquilino'
import PortalPageHeader from '../../components/inquilino/PortalPageHeader'
import { PortalInfoCard, PortalInfoGroup, PortalInfoRow } from '../../components/inquilino/PortalInfoList'
import { IconDocument, IconDownload } from '../../components/icons/Icons'
import { calloutClass, iconTileClass } from '../../utils/ui'
import useProyeccionAumentoInquilino from '../../hooks/useProyeccionAumentoInquilino'
import { usePortalInquilino } from '../../contexts/PortalInquilinoContext'
import {
  descargarDocumentoPortal,
  etiquetaTipoArchivo,
  listarDocumentosPortalContrato,
} from '../../services/portalInquilinoService'
import { armarResumenAlquilerInquilino } from '../../utils/resumenAlquilerInquilino'
import { armarHistorialMontosContrato } from '../../utils/historialMontosInquilino'
import {
  portalBadge,
  portalCardClass,
  portalColHalf,
  portalColMain,
  portalColSide,
  portalEmptyState,
  portalErrorState,
  portalGridPage,
  portalLoadingState,
  portalMontoLg,
  portalPageShell,
  portalSection,
  portalSectionTitle,
} from '../../utils/portalInquilinoUi'
import { formatPeriodoMesAnio } from '../../utils/aumentosUi'

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
      <div className={portalLoadingState}>
        <p>Cargando tu contrato…</p>
      </div>
    )
  }

  if (error) {
    return <div className={portalErrorState}>{error}</div>
  }

  const subtitulo =
    contrato && resumen
      ? `${contrato.propiedades?.direccion ?? '—'}${contrato.propiedades?.tipo ? ` · ${contrato.propiedades.tipo}` : ''}`
      : null

  return (
    <div className={portalPageShell}>
      <PortalPageHeader title="Tu contrato" subtitle={subtitulo} />

      {!contrato || !resumen ? (
        <div className={portalEmptyState}>
          <p className="text-sm font-medium text-slate-700">No tenés un contrato activo actualmente.</p>
          <p className="mt-1 text-sm text-slate-500">Contactá a la inmobiliaria para más información.</p>
        </div>
      ) : (
        <div className={portalGridPage}>
          <section className={`${portalSection} ${portalColHalf}`}>
            <h2 className={portalSectionTitle}>Resumen</h2>
            <div className={`${portalCardClass} p-5`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-500">
                  {contrato.estado === 'activo' ? 'Alquiler mensual' : 'Último monto · contrato finalizado'}
                </p>
                {contrato.estado === 'activo' && resumen.mesContratoCorto && (
                  <span className={portalBadge}>{resumen.mesContratoCorto}</span>
                )}
              </div>

              <p className={`mt-1 ${portalMontoLg}`}>{formatMonto(contrato.monto_alquiler)}</p>

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

          <section className={`${portalSection} ${portalColHalf}`}>
            <h2 className={portalSectionTitle}>Condiciones</h2>
            <PortalInfoCard>
              <PortalInfoGroup titulo="Montos">
                <PortalInfoRow label="Monto inicial" value={formatMonto(contrato.monto_inicial)} />
              </PortalInfoGroup>

              <PortalInfoGroup titulo="Ajustes">
                <PortalInfoRow
                  label="Tipo de ajuste"
                  value={tipoAjusteLabel[contrato.tipo_ajuste] ?? contrato.tipo_ajuste}
                />
                <PortalInfoRow
                  label="Periodicidad"
                  value={
                    contrato.periodicidad_meses
                      ? `Cada ${contrato.periodicidad_meses} mes${contrato.periodicidad_meses > 1 ? 'es' : ''}`
                      : null
                  }
                />
                {contrato.fecha_proximo_aumento && contrato.estado === 'activo' && (
                  <PortalInfoRow
                    label="Próximo aumento"
                    value={formatPeriodoMesAnio(contrato.fecha_proximo_aumento)}
                  />
                )}
              </PortalInfoGroup>

              {contrato.observaciones && (
                <PortalInfoGroup titulo="Observaciones">
                  <li className="px-4 py-3 lg:px-5">
                    <p className="text-sm leading-relaxed text-slate-700">{contrato.observaciones}</p>
                  </li>
                </PortalInfoGroup>
              )}
            </PortalInfoCard>
          </section>

          <section className={`${portalSection} ${portalColMain}`}>
            <h2 className={portalSectionTitle}>Historial de montos</h2>
            <HistorialMontosInquilino filas={historialMontos} />
          </section>

          <section className={`${portalSection} ${portalColSide}`}>
            <h2 className={portalSectionTitle}>Documentación</h2>

            {docsLoading ? (
              <div className={`${portalCardClass} px-4 py-6 text-center text-sm text-slate-500`}>
                Cargando documentos…
              </div>
            ) : docsError ? (
              <div className={calloutClass('danger')}>{docsError}</div>
            ) : documentos.length === 0 ? (
              <div className={`${portalCardClass} px-4 py-8 text-center`}>
                <div className={`${iconTileClass('neutral', 'lg', 'circle')} mx-auto`}>
                  <IconDocument className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm text-slate-500">
                  Todavía no hay documentos compartidos para tu contrato.
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
                    className={`${portalCardClass} group flex w-full items-center gap-3 p-3.5 text-left transition hover:border-slate-300 hover:shadow-pop disabled:opacity-60`}
                  >
                    <span className={iconTileClass('brand')}>
                      <IconDocument className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{documento.nombre}</p>
                      <p className="text-xs text-slate-500">
                        {etiquetaTipoArchivo(documento.nombre)} · {formatFechaDoc(documento.fecha_subida)}
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand-600 group-hover:text-brand-800">
                      <IconDownload className="h-4 w-4" />
                      {descargandoId === documento.id ? 'Abriendo…' : 'Descargar'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
