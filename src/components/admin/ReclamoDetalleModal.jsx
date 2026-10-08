import { useEffect, useState } from 'react'
import InquilinoDetalleModal from './InquilinoDetalleModal'
import PropiedadDetalleModal from './PropiedadDetalleModal'
import ReclamoTimeline from './ReclamoTimeline'
import { ReclamoCategoriaChip, ReclamoEstadoChip, ReclamoPrioridadChip } from './ReclamoChips'
import { listarAdjuntosReclamo, obtenerUrlDescargaDocumento } from '../../services/documentosService'
import { listarEventosReclamo } from '../../services/reclamosService'
import DetalleFila from '../ui/DetailField'
import {
  IconArrowRight,
  IconBuilding,
  IconCalendar,
  IconClipboard,
  IconFlag,
  IconImage,
  IconSignal,
  IconTag,
  IconUser,
  IconWrench,
} from '../icons/Icons'
import Modal, { ModalBody, ModalFooter, ModalHeader } from '../ui/Modal'
import Button from '../ui/Button'
import { calloutClass, eyebrow, surfaceMuted } from '../../utils/ui'

const verDetalleLinkClass =
  'inline-flex shrink-0 items-center gap-1 text-xs font-medium text-brand-600 transition hover:text-brand-800'

function CategoriaChip({ categoria }) {
  return <ReclamoCategoriaChip categoria={categoria} />
}

function SeccionTitulo({ children, className = '' }) {
  return (
    <h3
      className={`${eyebrow} ${className}`}
    >
      {children}
    </h3>
  )
}

function formatearFecha(fecha) {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default function ReclamoDetalleModal({
  open,
  reclamo,
  onClose,
  onManage,
  inquilinos = [],
  propiedades = [],
}) {
  const [adjuntos, setAdjuntos] = useState([])
  const [urls, setUrls] = useState({})
  const [cargandoAdjuntos, setCargandoAdjuntos] = useState(false)
  const [errorAdjuntos, setErrorAdjuntos] = useState(null)
  const [detalleInquilinoOpen, setDetalleInquilinoOpen] = useState(false)
  const [detallePropiedadOpen, setDetallePropiedadOpen] = useState(false)
  const [eventos, setEventos] = useState([])
  const [cargandoEventos, setCargandoEventos] = useState(false)
  const [errorEventos, setErrorEventos] = useState(null)

  const reclamoId = reclamo?.id

  useEffect(() => {
    if (!open || !reclamoId) {
      setEventos([])
      setErrorEventos(null)
      return undefined
    }

    let activo = true
    setCargandoEventos(true)
    setErrorEventos(null)
    listarEventosReclamo(reclamoId).then(({ data, error }) => {
      if (!activo) return
      if (error) {
        setErrorEventos('No se pudo cargar el historial.')
        setEventos([])
      } else {
        setEventos(data ?? [])
      }
      setCargandoEventos(false)
    })

    return () => {
      activo = false
    }
  }, [open, reclamoId])

  useEffect(() => {
    if (!open || !reclamoId) {
      setAdjuntos([])
      setUrls({})
      setErrorAdjuntos(null)
      setDetalleInquilinoOpen(false)
      setDetallePropiedadOpen(false)
      return undefined
    }

    let activo = true

    async function cargar() {
      setCargandoAdjuntos(true)
      setErrorAdjuntos(null)
      const { data, error } = await listarAdjuntosReclamo(reclamoId)
      if (!activo) return
      if (error) {
        setErrorAdjuntos('No se pudieron cargar las imágenes.')
        setAdjuntos([])
        setUrls({})
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
      if (!activo) return
      setUrls(Object.fromEntries(entradas))
      setCargandoAdjuntos(false)
    }

    cargar()
    return () => {
      activo = false
    }
  }, [open, reclamoId])

  if (!open || !reclamo) return null

  const inquilinoFull =
    inquilinos.find((i) => String(i.id) === String(reclamo.inquilino_id)) ?? null
  const propiedadFull =
    propiedades.find((p) => String(p.id) === String(reclamo.propiedad_id)) ?? null

  return (
    <>
      <Modal open={open} onClose={onClose} size="5xl" labelledBy="reclamo-detalle-titulo">
        <ModalHeader
          titleId="reclamo-detalle-titulo"
          icon={IconWrench}
          title={reclamo.titulo ?? 'Detalle del reclamo'}
          subtitle={`Creado el ${formatearFecha(reclamo.fecha_creacion)}`}
          onClose={onClose}
        />

        <ModalBody className="space-y-5">
          <section>
            <SeccionTitulo className="mb-2.5">Partes</SeccionTitulo>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetalleFila
                label="Inquilino"
                value={reclamo.inquilinos?.nombre_completo ?? '—'}
                icon={IconUser}
                action={
                  inquilinoFull ? (
                    <button type="button" onClick={() => setDetalleInquilinoOpen(true)} className={verDetalleLinkClass}>
                      Ver ficha
                      <IconArrowRight className="h-3 w-3" />
                    </button>
                  ) : null
                }
              />
              <DetalleFila
                label="Propiedad"
                value={reclamo.propiedades?.direccion ?? '—'}
                icon={IconBuilding}
                action={
                  propiedadFull ? (
                    <button type="button" onClick={() => setDetallePropiedadOpen(true)} className={verDetalleLinkClass}>
                      Ver ficha
                      <IconArrowRight className="h-3 w-3" />
                    </button>
                  ) : null
                }
              />
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div className="space-y-5">
              <section>
                <SeccionTitulo className="mb-2.5">Datos del reclamo</SeccionTitulo>
                <div className="grid grid-cols-2 gap-3">
                  <DetalleFila label="Fecha de creación" value={formatearFecha(reclamo.fecha_creacion)} icon={IconCalendar} />
                  <DetalleFila label="Categoría" icon={IconTag}>
                    <CategoriaChip categoria={reclamo.categoria} />
                  </DetalleFila>
                  <DetalleFila label="Estado" icon={IconFlag}>
                    <ReclamoEstadoChip estado={reclamo.estado} />
                  </DetalleFila>
                  <DetalleFila label="Prioridad" icon={IconSignal}>
                    <ReclamoPrioridadChip prioridad={reclamo.prioridad} />
                  </DetalleFila>
                </div>
              </section>

              <section>
                <SeccionTitulo className="mb-2.5">Descripción</SeccionTitulo>
                <p className={`${surfaceMuted} whitespace-pre-line px-3.5 py-3 text-sm leading-relaxed text-slate-700`}>
                  {reclamo.descripcion?.trim() || 'Sin descripción.'}
                </p>
              </section>

              <section>
                <SeccionTitulo className="mb-2.5">
                  Imágenes{adjuntos.length > 0 ? ` (${adjuntos.length})` : ''}
                </SeccionTitulo>

                {errorAdjuntos && <p className={calloutClass('danger', 'mb-2')}>{errorAdjuntos}</p>}

                {cargandoAdjuntos ? (
                  <p className="text-sm text-slate-500">Cargando imágenes…</p>
                ) : adjuntos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-6 text-slate-400">
                    <IconImage className="h-6 w-6" />
                    <p className="text-sm">Sin imágenes adjuntas</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {adjuntos.map((doc) => (
                      <div
                        key={doc.id}
                        className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                      >
                        {urls[doc.id] ? (
                          <a href={urls[doc.id]} target="_blank" rel="noopener noreferrer" title={doc.nombre}>
                            <img
                              src={urls[doc.id]}
                              alt={doc.nombre}
                              className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                              loading="lazy"
                            />
                          </a>
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-300">
                            <IconImage className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <section className="lg:self-start">
              <SeccionTitulo className="mb-2.5">Historial</SeccionTitulo>
              <ReclamoTimeline eventos={eventos} loading={cargandoEventos} error={errorEventos} />
            </section>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          {onManage && (
            <Button icon={IconClipboard} onClick={() => onManage(reclamo)}>
              Gestionar
            </Button>
          )}
        </ModalFooter>
      </Modal>

      <InquilinoDetalleModal
        open={detalleInquilinoOpen}
        inquilino={inquilinoFull}
        onClose={() => setDetalleInquilinoOpen(false)}
        apilado
      />

      <PropiedadDetalleModal
        open={detallePropiedadOpen}
        propiedad={propiedadFull}
        onClose={() => setDetallePropiedadOpen(false)}
        apilado
      />
    </>
  )
}
