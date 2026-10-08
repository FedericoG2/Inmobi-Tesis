import { useEffect, useState } from 'react'
import ReclamoTimeline from './ReclamoTimeline'
import {
  ReclamoCategoriaChip,
  ReclamoEstadoChip,
  ReclamoEstadoSelectChip,
  ReclamoPrioridadChip,
} from './ReclamoChips'
import { estadosPermitidos } from '../../utils/validarReclamo'
import { listarEventosReclamo } from '../../services/reclamosService'
import { IconCheckCircle, IconClipboard, IconUndo } from '../icons/Icons'
import Modal, { ModalBody, ModalFooter, ModalHeader } from '../ui/Modal'
import Button from '../ui/Button'
import { calloutClass, cn, eyebrow, fieldHintClass, textareaClass } from '../../utils/ui'

function SeccionTitulo({ children, hint }) {
  return (
    <div className="mb-2.5">
      <h3 className={eyebrow}>{children}</h3>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
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
    <Modal open={open} onClose={guardando ? undefined : onClose} size="xl" labelledBy="reclamo-gestion-titulo">
      <ModalHeader
        titleId="reclamo-gestion-titulo"
        icon={IconClipboard}
        title={reclamo.titulo ?? 'Gestionar reclamo'}
        subtitle={
          [reclamo.inquilinos?.nombre_completo, reclamo.propiedades?.direccion].filter(Boolean).join(' · ') ||
          'Gestionar reclamo'
        }
        onClose={guardando ? undefined : onClose}
      >
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <ReclamoEstadoChip estado={estadoActual} />
          {reclamo.categoria ? <ReclamoCategoriaChip categoria={reclamo.categoria} /> : null}
          <ReclamoPrioridadChip prioridad={reclamo.prioridad} />
        </div>
      </ModalHeader>

      <ModalBody className="space-y-6">
        <section>
          <SeccionTitulo hint="Seleccioná el nuevo estado si corresponde">Cambiar estado</SeccionTitulo>

          {esResuelto && !reabriendo ? (
            <div className={cn(calloutClass('success'), 'flex flex-wrap items-center justify-between gap-3')}>
              <div className="flex items-center gap-2">
                <IconCheckCircle className="h-5 w-5" />
                <span>Este reclamo ya fue cerrado.</span>
              </div>
              <Button variant="secondary" size="sm" icon={IconUndo} onClick={() => setReabriendo(true)}>
                Reabrir reclamo
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setReabriendo(false)
                    setEstadoSel(null)
                  }}
                  className="mt-2"
                >
                  Cancelar reapertura
                </Button>
              )}
            </>
          )}
        </section>

        <section>
          <SeccionTitulo hint="Queda registrado en el historial del reclamo">Comentario</SeccionTitulo>
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
            className={cn(textareaClass, 'resize-none')}
          />
          <p className={fieldHintClass}>Si no cambiás el estado, el comentario queda como nota en el historial.</p>
        </section>

        {errorGestion && <p className={calloutClass('danger')}>{errorGestion}</p>}

        <section>
          <SeccionTitulo>Historial</SeccionTitulo>
          <ReclamoTimeline eventos={eventos} loading={cargandoEventos} error={errorEventos} />
        </section>
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={guardando}>
          Cerrar
        </Button>
        <Button onClick={handleGuardar} loading={guardando} disabled={!puedeGuardar}>
          Guardar gestión
        </Button>
      </ModalFooter>
    </Modal>
  )
}
