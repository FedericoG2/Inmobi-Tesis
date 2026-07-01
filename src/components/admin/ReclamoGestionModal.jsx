import { useEffect, useState } from 'react'
import { Button } from '@tremor/react'
import AdminFormModalHeader from './AdminFormModalHeader'
import ReclamoTimeline from './ReclamoTimeline'
import {
  ReclamoCategoriaChip,
  ReclamoEstadoChip,
  ReclamoEstadoSelectChip,
  ReclamoPrioridadChip,
} from './ReclamoChips'
import { estadosPermitidos } from '../../utils/validarReclamo'
import { listarEventosReclamo } from '../../services/reclamosService'

function IconGestion({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v9.75c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
      />
    </svg>
  )
}

function IconAlerta({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
      />
    </svg>
  )
}

function SeccionTitulo({ children, hint }) {
  return (
    <div className="mb-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {children}
      </h3>
      {hint ? <p className="mt-0.5 text-xs text-slate-400">{hint}</p> : null}
    </div>
  )
}

function SeccionCard({ children, className = '' }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-4 ${className}`}>
      {children}
    </section>
  )
}

export default function ReclamoGestionModal({ open, reclamo, onClose, onGestionar }) {
  const [estadoActual, setEstadoActual] = useState(null)
  const [estadoSel, setEstadoSel] = useState(null)
  const [comentario, setComentario] = useState('')
  const [reabriendo, setReabriendo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errorGestion, setErrorGestion] = useState(null)

  const [eventos, setEventos] = useState([])
  const [cargandoEventos, setCargandoEventos] = useState(false)
  const [errorEventos, setErrorEventos] = useState(null)

  const reclamoId = reclamo?.id

  async function cargarEventos(id) {
    setCargandoEventos(true)
    setErrorEventos(null)
    const { data, error } = await listarEventosReclamo(id)
    if (error) {
      setErrorEventos('No se pudo cargar el historial.')
      setEventos([])
    } else {
      setEventos(data ?? [])
    }
    setCargandoEventos(false)
  }

  useEffect(() => {
    if (!open || !reclamoId) {
      setEstadoActual(null)
      setEstadoSel(null)
      setComentario('')
      setReabriendo(false)
      setErrorGestion(null)
      setEventos([])
      return
    }
    setEstadoActual(reclamo.estado)
    setEstadoSel(null)
    setComentario('')
    setReabriendo(false)
    setErrorGestion(null)
    cargarEventos(reclamoId)
  }, [open, reclamoId, reclamo?.estado])

  if (!open || !reclamo) return null

  const esResuelto = estadoActual === 'Resuelto'
  const opciones = estadosPermitidos(estadoActual).filter((e) => e !== estadoActual)
  const comentarioLimpio = comentario.trim()
  const hayCambioEstado = estadoSel && estadoSel !== estadoActual
  const puedeGuardar = Boolean(hayCambioEstado || comentarioLimpio)

  const seleccionarEstado = (estado) => {
    setErrorGestion(null)
    setEstadoSel((prev) => (prev === estado ? null : estado))
  }

  const handleGuardar = async () => {
    if (!puedeGuardar || guardando) return
    setGuardando(true)
    setErrorGestion(null)

    const res = await onGestionar({
      reclamoId,
      estado: hayCambioEstado ? estadoSel : null,
      comentario: comentarioLimpio || null,
    })

    if (!res?.ok) {
      setErrorGestion(res?.error?.message ?? 'No se pudo guardar la gestión.')
      setGuardando(false)
      return
    }

    if (hayCambioEstado) setEstadoActual(estadoSel)
    setEstadoSel(null)
    setComentario('')
    setReabriendo(false)
    await cargarEventos(reclamoId)
    setGuardando(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar gestión"
        className="fixed inset-0 bg-slate-900/50"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reclamo-gestion-titulo"
        className="relative z-10 flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 shadow-xl"
      >
        <AdminFormModalHeader
          title="Gestionar reclamo"
          titleId="reclamo-gestion-titulo"
          icon={<IconGestion />}
        />

        <div className="overflow-y-auto px-5 py-4">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
            <h2 className="text-base font-semibold leading-snug text-slate-900">
              {reclamo.titulo ?? 'Reclamo'}
            </h2>
            {(reclamo.inquilinos?.nombre_completo || reclamo.propiedades?.direccion) && (
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {[reclamo.inquilinos?.nombre_completo, reclamo.propiedades?.direccion]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ReclamoEstadoChip estado={estadoActual} />
              {reclamo.categoria ? <ReclamoCategoriaChip categoria={reclamo.categoria} /> : null}
              <ReclamoPrioridadChip prioridad={reclamo.prioridad} />
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <SeccionCard>
              <SeccionTitulo hint="Seleccioná el nuevo estado si corresponde">
                Cambiar estado
              </SeccionTitulo>

              {esResuelto && !reabriendo ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3.5 py-3">
                  <div className="flex items-center gap-2">
                    <ReclamoEstadoChip estado="Resuelto" />
                    <span className="text-sm text-emerald-800">Este reclamo ya fue cerrado.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReabriendo(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-50"
                  >
                    <IconAlerta className="h-4 w-4" />
                    Reabrir reclamo
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {opciones.map((estado) => (
                      <ReclamoEstadoSelectChip
                        key={estado}
                        estado={estado}
                        selected={estadoSel === estado}
                        onClick={() => seleccionarEstado(estado)}
                      />
                    ))}
                  </div>
                  {esResuelto && reabriendo && (
                    <button
                      type="button"
                      onClick={() => {
                        setReabriendo(false)
                        setEstadoSel(null)
                      }}
                      className="mt-2.5 text-xs font-medium text-slate-500 transition hover:text-slate-700 hover:underline"
                    >
                      Cancelar reapertura
                    </button>
                  )}
                </>
              )}
            </SeccionCard>

            <SeccionCard>
              <SeccionTitulo hint="Queda registrado en el historial del reclamo">
                Comentario
              </SeccionTitulo>
              <label htmlFor="gestion-comentario" className="sr-only">
                Comentario de gestión
              </label>
              <textarea
                id="gestion-comentario"
                rows={3}
                value={comentario}
                onChange={(e) => {
                  setComentario(e.target.value)
                  setErrorGestion(null)
                }}
                placeholder="Ej: Se coordinó la visita del plomero para el martes."
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
              />
              <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                Si no cambiás el estado, el comentario queda como nota en el historial.
              </p>
            </SeccionCard>

            {errorGestion && (
              <p className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
                {errorGestion}
              </p>
            )}

            <SeccionCard>
              <SeccionTitulo>Historial</SeccionTitulo>
              <ReclamoTimeline
                eventos={eventos}
                loading={cargandoEventos}
                error={errorEventos}
                className="border-0 bg-slate-50/60 p-0"
              />
            </SeccionCard>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 bg-white px-5 py-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={guardando}>
            Cerrar
          </Button>
          <Button
            type="button"
            onClick={handleGuardar}
            loading={guardando}
            disabled={!puedeGuardar || guardando}
            className="border-none bg-brand-600 text-white hover:bg-brand-700"
          >
            Guardar gestión
          </Button>
        </div>
      </div>
    </div>
  )
}
