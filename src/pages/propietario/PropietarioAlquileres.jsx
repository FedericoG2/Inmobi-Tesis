import { useMemo, useState } from 'react'
import { useConsulta } from '../../hooks/useConsulta'
import { usePortalPropietario } from '../../contexts/PortalPropietarioContext'
import PortalPageHeader from '../../components/inquilino/PortalPageHeader'
import HistorialMontosInquilino from '../../components/inquilino/HistorialMontosInquilino'
import { PortalInfoCard, PortalInfoGroup, PortalInfoRow } from '../../components/inquilino/PortalInfoList'
import PeriodosPagoLista from '../../components/alquileres/PeriodosPagoLista'
import Badge from '../../components/ui/Badge'
import { IconDocument, IconDownload } from '../../components/icons/Icons'
import { listarPeriodosContrato } from '../../services/alquileresService'
import { etiquetaTipoArchivo, obtenerUrlDescargaDocumento } from '../../services/documentosService'
import { listarDocumentosPropietario } from '../../services/portalPropietarioService'
import { armarHistorialMontosContrato } from '../../utils/historialMontosInquilino'
import { formatPeriodoMesAnio } from '../../utils/aumentosUi'
import { resumenPagos } from '../../utils/alquileresUi'
import { periodicidadLabelPorMeses } from '../../utils/contratoAumentosPreview'
import { hoyIsoLocal } from '../../utils/contratoVigencia'
import {
  portalCardClass,
  portalColMain,
  portalColSide,
  portalEmptyState,
  portalErrorState,
  portalGridPage,
  portalLoadingState,
  portalPageShell,
  portalSection,
  portalSectionTitle,
} from '../../utils/portalInquilinoUi'
import { calloutClass, iconTileClass } from '../../utils/ui'

const formatMonto = (monto) =>
  monto == null
    ? '—'
    : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(monto))

const formatFecha = (iso) => {
  if (!iso) return '—'
  const [y, m, d] = String(iso).slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

const AJUSTE = { ipc: 'IPC (INDEC)', icl: 'ICL (BCRA)' }

/** Un alquiler del propietario: condiciones, pagos, historial de montos y documentos (solo consulta). */
export default function PropietarioAlquileres() {
  const { contratoSeleccionado: contrato, loading, error } = usePortalPropietario()
  const [descargandoId, setDescargandoId] = useState(null)
  const [errorDescarga, setErrorDescarga] = useState(null)

  const pagos = useConsulta(contrato?.id ?? null, () => listarPeriodosContrato(contrato.id))
  const documentos = useConsulta(contrato?.id ?? null, () => listarDocumentosPropietario(contrato.id))
  const historialMontos = useMemo(() => armarHistorialMontosContrato(contrato), [contrato])

  if (loading) {
    return (
      <div className={portalLoadingState}>
        <p>Cargando tus alquileres…</p>
      </div>
    )
  }
  if (error) return <div className={portalErrorState}>{error}</div>

  if (!contrato) {
    return (
      <div className={portalPageShell}>
        <PortalPageHeader title="Alquileres" />
        <div className={portalEmptyState}>
          <p className="text-sm font-medium text-slate-700">Todavía no hay contratos sobre tus propiedades.</p>
        </div>
      </div>
    )
  }

  const hoy = hoyIsoLocal()
  const periodos = pagos.data ?? []
  const resumen = resumenPagos(periodos, hoy)
  const vigente = contrato.estado === 'activo'

  const descargar = async (documento) => {
    setDescargandoId(documento.id)
    setErrorDescarga(null)
    const { data, error: err } = await obtenerUrlDescargaDocumento(documento.url_archivo)
    setDescargandoId(null)
    if (err || !data?.signedUrl) {
      setErrorDescarga(err?.message ?? 'No se pudo abrir el documento')
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className={portalPageShell}>
      <PortalPageHeader
        title="Alquiler"
        subtitle={`${contrato.propiedades?.direccion ?? '—'}${contrato.propiedades?.tipo ? ` · ${contrato.propiedades.tipo}` : ''}`}
        action={
          <Badge tone={vigente ? 'success' : 'neutral'} dot>
            {vigente ? 'Contrato vigente' : 'Contrato finalizado'}
          </Badge>
        }
      />

      <div className={portalGridPage}>
        <section className={`${portalSection} ${portalColMain}`}>
          <h2 className={portalSectionTitle}>Pagos</h2>
          <p className="text-sm text-slate-500">
            {resumen.pagados} de {resumen.total} períodos pagados
            {resumen.pendientes > 0 && ` · ${formatMonto(resumen.montoPendiente)} pendiente`}. La inmobiliaria
            confirma cada pago al revisar el comprobante.
          </p>
          {pagos.cargandoPrimeraVez ? (
            <div className={`${portalCardClass} px-4 py-6 text-center text-sm text-slate-500`}>Cargando pagos…</div>
          ) : pagos.error ? (
            <div className={calloutClass('danger')}>No se pudieron cargar los pagos: {pagos.error.message}</div>
          ) : (
            <PeriodosPagoLista periodos={periodos} vacio="Todavía no hay períodos de alquiler." />
          )}
        </section>

        <div className={`space-y-5 ${portalColSide}`}>
          <PortalInfoCard titulo="Condiciones">
            <PortalInfoGroup titulo="Contrato">
              <PortalInfoRow label="Inquilino" value={contrato.inquilino_nombre} />
              <PortalInfoRow label="Vigencia" value={`${formatFecha(contrato.fecha_inicio)} al ${formatFecha(contrato.fecha_fin)}`} />
              <PortalInfoRow label="Vence cada mes" value={contrato.dia_vencimiento ? `Día ${contrato.dia_vencimiento}` : null} />
            </PortalInfoGroup>
            <PortalInfoGroup titulo="Montos y ajustes">
              <PortalInfoRow label="Monto actual" value={formatMonto(contrato.monto_alquiler)} />
              <PortalInfoRow label="Monto inicial" value={formatMonto(contrato.monto_inicial)} />
              <PortalInfoRow
                label="Ajuste"
                value={`${AJUSTE[contrato.tipo_ajuste] ?? contrato.tipo_ajuste} · ${periodicidadLabelPorMeses(contrato.periodicidad_meses)}`}
              />
              {vigente && contrato.fecha_proximo_aumento && (
                <PortalInfoRow label="Próximo aumento" value={formatPeriodoMesAnio(contrato.fecha_proximo_aumento)} />
              )}
            </PortalInfoGroup>
          </PortalInfoCard>

          <section className={portalSection}>
            <h2 className={portalSectionTitle}>Documentación</h2>
            {errorDescarga && <div className={calloutClass('danger')}>{errorDescarga}</div>}
            {documentos.cargandoPrimeraVez ? (
              <div className={`${portalCardClass} px-4 py-6 text-center text-sm text-slate-500`}>Cargando documentos…</div>
            ) : (documentos.data ?? []).length === 0 ? (
              <div className={`${portalCardClass} px-4 py-6 text-center text-sm text-slate-500`}>
                Todavía no hay documentos de este contrato.
              </div>
            ) : (
              <div className="space-y-2">
                {documentos.data.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => descargar(doc)}
                    disabled={descargandoId === doc.id}
                    className={`${portalCardClass} group flex w-full items-center gap-3 p-3.5 text-left transition hover:border-slate-300 hover:shadow-pop disabled:opacity-60`}
                  >
                    <span className={iconTileClass('brand')}>
                      <IconDocument className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{doc.nombre}</p>
                      <p className="text-xs text-slate-500">
                        {doc.categoria} · {etiquetaTipoArchivo(doc.nombre)} · {formatFecha(doc.fecha_subida)}
                      </p>
                    </div>
                    <IconDownload className="h-4 w-4 shrink-0 text-brand-600" />
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className={`${portalSection} lg:col-span-12`}>
          <h2 className={portalSectionTitle}>Historial de montos y aumentos</h2>
          <HistorialMontosInquilino filas={historialMontos} />
        </section>
      </div>
    </div>
  )
}
