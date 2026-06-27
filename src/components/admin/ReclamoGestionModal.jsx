import { useEffect, useState } from 'react'
import { Button } from '@tremor/react'
import AdminFormModalHeader from './AdminFormModalHeader'
import ReclamoTimeline from './ReclamoTimeline'
import { badgeEstado } from '../../utils/reclamosUi'
import { ESTADO_LABEL, estadosPermitidos } from '../../utils/validarReclamo'
import { listarEventosReclamo } from '../../services/reclamosService'

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

function EstadoBadge({ estado }) {
  const badge = badgeEstado(estado)
  if (!badge) return <span className="text-slate-400">—</span>
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
      {badge.label}
    </span>
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
        className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl"
      >
        <AdminFormModalHeader title="Gestionar reclamo" />

        <div className="border-b border-slate-100 px-6 py-3">
          <h2
            id="reclamo-gestion-titulo"
            className="truncate text-sm font-semibold text-slate-900"
          >
            {reclamo.titulo ?? 'Reclamo'}
          </h2>
          <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
            <span>Estado actual:</span>
            <EstadoBadge estado={estadoActual} />
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-4">
          {/* CAMBIO DE ESTADO */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Cambiar estado{' '}
              <span className="font-normal normal-case text-slate-400">(opcional)</span>
            </p>

            {esResuelto && !reabriendo ? (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2">
                <span className="text-sm text-emerald-700">
                  El reclamo está <span className="font-semibold">Resuelto</span>.
                </span>
                <button
                  type="button"
                  onClick={() => setReabriendo(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-600 transition hover:bg-amber-50"
                >
                  <IconAlerta className="h-4 w-4" />
                  Reabrir reclamo
                </button>
              </div>
            ) : (
              <>
                <div className="mt-2 flex flex-wrap gap-2">
                  {opciones.map((estado) => {
                    const activo = estadoSel === estado
                    return (
                      <button
                        key={estado}
                        type="button"
                        onClick={() => seleccionarEstado(estado)}
                        className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                          activo
                            ? 'border-indigo-500 bg-indigo-600 text-white font-semibold shadow-sm'
                            : 'border-slate-300 bg-white text-slate-600 hover:border-indigo-300'
                        }`}
                      >
                        {ESTADO_LABEL[estado] ?? estado}
                      </button>
                    )
                  })}
                </div>
                {esResuelto && reabriendo && (
                  <button
                    type="button"
                    onClick={() => {
                      setReabriendo(false)
                      setEstadoSel(null)
                    }}
                    className="mt-2 text-xs font-semibold text-slate-500 transition hover:text-slate-700 hover:underline"
                  >
                    Cancelar reapertura
                  </button>
                )}
              </>
            )}
          </div>

          {/* COMENTARIO */}
          <div className="mt-4">
            <label
              htmlFor="gestion-comentario"
              className="text-xs font-semibold uppercase tracking-wider text-slate-600"
            >
              Comentario{' '}
              <span className="font-normal normal-case text-slate-400">
                (qué se gestionó · opcional)
              </span>
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
              className="mt-1 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Si no cambiás el estado, el comentario queda como nota en el historial.
            </p>
          </div>

          {errorGestion && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 border border-red-100">
              {errorGestion}
            </p>
          )}

          {/* HISTORIAL */}
          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Historial
            </p>
            <div className="mt-2">
              <ReclamoTimeline
                eventos={eventos}
                loading={cargandoEventos}
                error={errorEventos}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={guardando}>
            Cerrar
          </Button>
          <Button
            type="button"
            onClick={handleGuardar}
            loading={guardando}
            disabled={!puedeGuardar || guardando}
            className="bg-indigo-600 hover:bg-indigo-700 text-white border-none"
          >
            Guardar gestión
          </Button>
        </div>
      </div>
    </div>
  )
}
