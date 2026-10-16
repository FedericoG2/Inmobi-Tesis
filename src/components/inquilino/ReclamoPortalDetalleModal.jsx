import { useCallback, useEffect, useState } from 'react'
import ReclamoTimeline from '../admin/ReclamoTimeline'
import {
  eliminarDocumentoContrato,
  listarAdjuntosReclamo,
  obtenerUrlDescargaDocumento,
  subirAdjuntoReclamo,
} from '../../services/documentosService'
import { listarEventosReclamo } from '../../services/reclamosService'
import { MAX_IMAGENES_RECLAMO } from '../../services/portalInquilinoService'
import { infoEstado, RECLAMO_CHIP_CLASS } from '../../utils/reclamosUi'
import { portalBtnGhost, portalBtnSecondary, portalCardClass, portalSectionTitle } from '../../utils/portalInquilinoUi'

export default function ReclamoPortalDetalleModal({ open, reclamo, perfilInquilinoId, onClose }) {
  const [eventos, setEventos] = useState([])
  const [cargandoEventos, setCargandoEventos] = useState(false)
  const [errorEventos, setErrorEventos] = useState(null)
  const [adjuntos, setAdjuntos] = useState([])
  const [urls, setUrls] = useState({})
  const [cargandoAdjuntos, setCargandoAdjuntos] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [errorAdjuntos, setErrorAdjuntos] = useState(null)

  const reclamoId = reclamo?.id
  const esPendiente = reclamo?.estado === 'Pendiente'

  const cargarAdjuntos = useCallback(async () => {
    if (!reclamoId) return
    setCargandoAdjuntos(true)
    const { data, error } = await listarAdjuntosReclamo(reclamoId)
    if (error) {
      setErrorAdjuntos('No se pudieron cargar las imágenes.')
      setAdjuntos([])
      setCargandoAdjuntos(false)
      return
    }
    const lista = data ?? []
    setAdjuntos(lista)
    const entradas = await Promise.all(
      lista.map(async (doc) => {
        const { data: urlData } = await obtenerUrlDescargaDocumento(doc.url_archivo)
        return [doc.id, urlData?.signedUrl ?? null]
      })
    )
    setUrls(Object.fromEntries(entradas))
    setCargandoAdjuntos(false)
  }, [reclamoId])

  useEffect(() => {
    if (!open || !reclamoId) {
      setEventos([])
      setAdjuntos([])
      setUrls({})
      setErrorAdjuntos(null)
      setErrorEventos(null)
      return undefined
    }

    let activo = true
    setCargandoEventos(true)
    listarEventosReclamo(reclamoId).then(({ data, error }) => {
      if (!activo) return
      setErrorEventos(error ? 'No se pudo cargar el historial.' : null)
      setEventos(data ?? [])
      setCargandoEventos(false)
    })
    cargarAdjuntos()

    return () => {
      activo = false
    }
  }, [open, reclamoId, cargarAdjuntos])

  if (!open || !reclamo) return null

  const estadoInfo = infoEstado(reclamo.estado)
  const cupoRestante = MAX_IMAGENES_RECLAMO - adjuntos.length

  const handleSubir = async (e) => {
    const archivos = Array.from(e.target.files ?? []).slice(0, Math.max(0, cupoRestante))
    e.target.value = ''
    if (!archivos.length) return
    setSubiendo(true)
    setErrorAdjuntos(null)
    for (const archivo of archivos) {
      const { error } = await subirAdjuntoReclamo({
        reclamoId: reclamo.id,
        propiedadId: reclamo.propiedad_id,
        archivo,
        visibleParaInquilino: true,
      })
      if (error) {
        setErrorAdjuntos(error.message ?? 'No se pudo subir la imagen')
        break
      }
    }
    await cargarAdjuntos()
    setSubiendo(false)
  }

  const handleQuitar = async (doc) => {
    setSubiendo(true)
    setErrorAdjuntos(null)
    const { error } = await eliminarDocumentoContrato(doc)
    if (error) setErrorAdjuntos(error.message ?? 'No se pudo quitar la imagen')
    await cargarAdjuntos()
    setSubiendo(false)
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 px-4 pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] lg:items-center lg:px-6 lg:pb-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reclamo-portal-detalle-titulo"
    >
      <button type="button" aria-label="Cerrar detalle" className="absolute inset-0" onClick={onClose} />
      <div
        className={`relative z-10 max-h-[min(85vh,44rem)] w-full max-w-lg overflow-y-auto ${portalCardClass} p-5 shadow-2xl lg:max-h-[90vh] lg:max-w-2xl lg:p-6`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 id="reclamo-portal-detalle-titulo" className={portalSectionTitle}>
              {reclamo.titulo}
            </h3>
            {reclamo.propiedades?.direccion && (
              <p className="mt-0.5 text-xs text-slate-400">{reclamo.propiedades.direccion}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {estadoInfo && (
              <span className={RECLAMO_CHIP_CLASS}>
                <span className="text-sm leading-none">{estadoInfo.icon}</span>
                <span>{estadoInfo.label}</span>
              </span>
            )}
            <button type="button" onClick={onClose} className={portalBtnGhost} aria-label="Cerrar">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {reclamo.descripcion && (
          <p className="mt-3 whitespace-pre-line text-sm text-slate-600">{reclamo.descripcion}</p>
        )}

        <section className="mt-5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Imágenes ({adjuntos.length}/{MAX_IMAGENES_RECLAMO})
            </h4>
            {esPendiente && cupoRestante > 0 && (
              <label className={`${portalBtnSecondary} cursor-pointer ${subiendo ? 'pointer-events-none opacity-50' : ''}`}>
                {subiendo ? 'Subiendo...' : 'Agregar imágenes'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="sr-only"
                  onChange={handleSubir}
                  disabled={subiendo}
                />
              </label>
            )}
          </div>
          {errorAdjuntos && <p className="mb-2 text-xs font-medium text-red-600">{errorAdjuntos}</p>}
          {cargandoAdjuntos && adjuntos.length === 0 ? (
            <p className="text-xs text-slate-500">Cargando imágenes...</p>
          ) : adjuntos.length === 0 ? (
            <p className="text-xs text-slate-400">
              {esPendiente ? 'Podés sumar hasta 5 fotos del problema.' : 'Este reclamo no tiene imágenes.'}
            </p>
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {adjuntos.map((doc) => (
                <li key={doc.id} className="group relative aspect-square overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200">
                  {urls[doc.id] ? (
                    <a href={urls[doc.id]} target="_blank" rel="noreferrer">
                      <img src={urls[doc.id]} alt={doc.nombre} className="h-full w-full object-cover" />
                    </a>
                  ) : null}
                  {esPendiente && (
                    <button
                      type="button"
                      onClick={() => handleQuitar(doc)}
                      disabled={subiendo}
                      className="absolute right-1 top-1 rounded-full bg-white/90 px-1.5 text-xs font-bold text-red-600 shadow ring-1 ring-red-200 disabled:opacity-40"
                      aria-label={`Quitar ${doc.nombre}`}
                    >
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-5">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Historial</h4>
          <ReclamoTimeline
            eventos={eventos}
            loading={cargandoEventos}
            error={errorEventos}
            perfilInquilinoId={perfilInquilinoId}
          />
        </section>
      </div>
    </div>
  )
}
