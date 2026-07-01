import { useEffect, useState } from 'react'
import { Button } from '@tremor/react'
import AdminFormModalHeader from './AdminFormModalHeader'
import InquilinoDetalleModal from './InquilinoDetalleModal'
import PropiedadDetalleModal from './PropiedadDetalleModal'
import ReclamoTimeline from './ReclamoTimeline'
import { badgePrioridad, PILL_SOLID_CLASS } from '../../utils/reclamosUi'
import { ReclamoCategoriaChip, ReclamoEstadoChip } from './ReclamoChips'
import { listarAdjuntosReclamo, obtenerUrlDescargaDocumento } from '../../services/documentosService'
import { listarEventosReclamo } from '../../services/reclamosService'

function IconWrench({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l5.654-4.654m5.292-8.93a3 3 0 0 1 4.243 4.242M5.196 5.196l13.608 13.608"
      />
    </svg>
  )
}

function IconUser({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
      />
    </svg>
  )
}

function IconBuilding({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 21h19.5M3.75 21V7.5a1.5 1.5 0 0 1 1.5-1.5h4.5a1.5 1.5 0 0 1 1.5 1.5V21M13.5 21V4.5a1.5 1.5 0 0 1 1.5-1.5h3.75a1.5 1.5 0 0 1 1.5 1.5V21M6.75 9h.008v.008H6.75V9Zm0 3h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Z"
      />
    </svg>
  )
}

function IconCalendar({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
      />
    </svg>
  )
}

function IconFlag({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5"
      />
    </svg>
  )
}

function IconSignal({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 21h16.5M4.5 3v18m4.5-18v18m4.5-12v12m4.5-8v8"
      />
    </svg>
  )
}

function IconTag({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
    </svg>
  )
}

function IconImage({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
      />
    </svg>
  )
}

const verDetalleLinkClass =
  'shrink-0 text-xs font-semibold text-indigo-600 transition hover:text-indigo-700 hover:underline'

function DetalleFila({ label, value, icon: Icon, action, children, className = '' }) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2 ${className}`}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 ring-1 ring-slate-100">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        {children ? (
          <div className="mt-0.5">{children}</div>
        ) : (
          <p className="text-sm font-medium leading-tight text-slate-800 break-words">{value}</p>
        )}
      </div>
      {action}
    </div>
  )
}

function Pill({ badge }) {
  if (!badge) return <span className="text-slate-400">—</span>
  return <span className={`${PILL_SOLID_CLASS} ${badge.className}`}>{badge.label}</span>
}

function CategoriaChip({ categoria }) {
  return <ReclamoCategoriaChip categoria={categoria} />
}

function SeccionTitulo({ children, className = '' }) {
  return (
    <h3
      className={`text-[11px] font-semibold uppercase tracking-wide text-slate-500 ${className}`}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar detalle"
        className="fixed inset-0 bg-slate-900/50"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reclamo-detalle-titulo"
        className="relative z-10 flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl"
      >
        <AdminFormModalHeader
          title="Detalle del Reclamo"
          titleId="reclamo-detalle-titulo"
          icon={<IconWrench className="h-5 w-5" />}
        />

        <div className="border-b border-slate-100 px-6 py-3">
          <SeccionTitulo className="mb-2">Partes</SeccionTitulo>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <DetalleFila
              label="Inquilino"
              value={reclamo.inquilinos?.nombre_completo ?? '—'}
              icon={IconUser}
              action={
                inquilinoFull ? (
                  <button
                    type="button"
                    onClick={() => setDetalleInquilinoOpen(true)}
                    className={verDetalleLinkClass}
                  >
                    Ver detalle
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
                  <button
                    type="button"
                    onClick={() => setDetallePropiedadOpen(true)}
                    className={verDetalleLinkClass}
                  >
                    Ver detalle
                  </button>
                ) : null
              }
            />
          </div>
        </div>

        <div className="px-6 py-3">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div className="space-y-3">
              <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2">
                <p className="text-[11px] font-medium text-indigo-700">Reclamo</p>
                <p className="mt-0.5 text-base font-semibold leading-snug text-indigo-950">
                  {reclamo.titulo ?? '—'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <DetalleFila
                  label="Fecha de creación"
                  value={formatearFecha(reclamo.fecha_creacion)}
                  icon={IconCalendar}
                />
                <DetalleFila label="Categoría" icon={IconTag}>
                  <CategoriaChip categoria={reclamo.categoria} />
                </DetalleFila>
                <DetalleFila label="Estado" icon={IconFlag}>
                  <ReclamoEstadoChip estado={reclamo.estado} />
                </DetalleFila>
                <DetalleFila label="Prioridad" icon={IconSignal}>
                  <Pill badge={badgePrioridad(reclamo.prioridad)} />
                </DetalleFila>
              </div>

              <div className="rounded-lg border border-slate-200 px-3 py-2">
                <SeccionTitulo className="mb-1">Descripción</SeccionTitulo>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                  {reclamo.descripcion?.trim() || 'Sin descripción.'}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 px-3 py-2">
                <SeccionTitulo className="mb-1">
                  Imágenes{adjuntos.length > 0 ? ` (${adjuntos.length})` : ''}
                </SeccionTitulo>

                {errorAdjuntos && (
                  <p className="mt-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700">
                    {errorAdjuntos}
                  </p>
                )}

                {cargandoAdjuntos ? (
                  <p className="mt-1 text-xs text-slate-400">Cargando imágenes…</p>
                ) : adjuntos.length === 0 ? (
                  <div className="mt-1 flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-200 py-4 text-slate-400">
                    <IconImage />
                    <p className="text-xs">Sin imágenes adjuntas</p>
                  </div>
                ) : (
                  <div className="mt-1 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {adjuntos.map((doc) => (
                      <div
                        key={doc.id}
                        className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                      >
                        {urls[doc.id] ? (
                          <a
                            href={urls[doc.id]}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={doc.nombre}
                          >
                            <img
                              src={urls[doc.id]}
                              alt={doc.nombre}
                              className="h-full w-full object-cover transition group-hover:opacity-90"
                              loading="lazy"
                            />
                          </a>
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-300">
                            <IconImage />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:self-start">
              <SeccionTitulo className="mb-2">Historial</SeccionTitulo>
              <ReclamoTimeline eventos={eventos} loading={cargandoEventos} error={errorEventos} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          {onManage && (
            <Button
              onClick={() => onManage(reclamo)}
              className="!border-indigo-600 !bg-indigo-600 !text-white hover:!border-indigo-700 hover:!bg-indigo-700"
            >
              Gestionar
            </Button>
          )}
        </div>
      </div>

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
    </div>
  )
}
