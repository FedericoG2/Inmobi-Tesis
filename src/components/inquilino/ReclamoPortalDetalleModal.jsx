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
import { ReclamoCategoriaChip, ReclamoEstadoChip, ReclamoPrioridadChip } from '../admin/ReclamoChips'
import Modal, { ModalBody, ModalFooter, ModalHeader } from '../ui/Modal'
import Button from '../ui/Button'
import { IconImage, IconUpload, IconWrench, IconX } from '../icons/Icons'
import { buttonClass, calloutClass, cn, eyebrow, surfaceMuted } from '../../utils/ui'

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
    <Modal open={open} onClose={onClose} size="2xl" layer="stacked" labelledBy="reclamo-portal-detalle-titulo">
      <ModalHeader
        titleId="reclamo-portal-detalle-titulo"
        icon={IconWrench}
        title={reclamo.titulo}
        subtitle={reclamo.propiedades?.direccion}
        onClose={onClose}
      >
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <ReclamoEstadoChip estado={reclamo.estado} />
          <ReclamoCategoriaChip categoria={reclamo.categoria} />
          <ReclamoPrioridadChip prioridad={reclamo.prioridad} />
        </div>
      </ModalHeader>

      <ModalBody className="space-y-6">
        {reclamo.descripcion && (
          <p className={`${surfaceMuted} whitespace-pre-line px-3.5 py-3 text-sm leading-relaxed text-slate-700`}>
            {reclamo.descripcion}
          </p>
        )}

        <section>
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <h4 className={eyebrow}>
              Imágenes ({adjuntos.length}/{MAX_IMAGENES_RECLAMO})
            </h4>
            {esPendiente && cupoRestante > 0 && (
              <label
                className={cn(
                  buttonClass({ variant: 'secondary', size: 'sm' }),
                  'cursor-pointer',
                  subiendo && 'pointer-events-none opacity-50'
                )}
              >
                <IconUpload className="h-3.5 w-3.5" strokeWidth={2} />
                {subiendo ? 'Subiendo…' : 'Agregar imágenes'}
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
          {errorAdjuntos && <p className={calloutClass('danger', 'mb-2')}>{errorAdjuntos}</p>}
          {cargandoAdjuntos && adjuntos.length === 0 ? (
            <p className="text-sm text-slate-500">Cargando imágenes…</p>
          ) : adjuntos.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-6 text-slate-400">
              <IconImage className="h-6 w-6" />
              <p className="text-sm">
                {esPendiente ? `Podés sumar hasta ${MAX_IMAGENES_RECLAMO} fotos del problema.` : 'Este reclamo no tiene imágenes.'}
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {adjuntos.map((doc) => (
                <li
                  key={doc.id}
                  className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                >
                  {urls[doc.id] ? (
                    <a href={urls[doc.id]} target="_blank" rel="noreferrer" title={doc.nombre}>
                      <img
                        src={urls[doc.id]}
                        alt={doc.nombre}
                        className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                      />
                    </a>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-300">
                      <IconImage className="h-6 w-6" />
                    </div>
                  )}
                  {esPendiente && (
                    <button
                      type="button"
                      onClick={() => handleQuitar(doc)}
                      disabled={subiendo}
                      className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/90 text-slate-600 shadow-card ring-1 ring-slate-200 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                      aria-label={`Quitar ${doc.nombre}`}
                    >
                      <IconX className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h4 className={`${eyebrow} mb-2.5`}>Historial</h4>
          <ReclamoTimeline
            eventos={eventos}
            loading={cargandoEventos}
            error={errorEventos}
            perfilInquilinoId={perfilInquilinoId}
          />
        </section>
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      </ModalFooter>
    </Modal>
  )
}
