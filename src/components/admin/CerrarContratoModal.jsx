import { useState } from 'react'
import Modal, { ModalBody, ModalFooter, ModalHeader } from '../ui/Modal'
import Button from '../ui/Button'
import { IconClipboard } from '../icons/Icons'
import { calloutClass, cn, fieldHintClass, labelClass, textareaClass } from '../../utils/ui'

const opcionClass = (activa) =>
  cn(
    'flex flex-col gap-0.5 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition',
    activa
      ? 'border-brand-500 bg-brand-50 text-brand-800 ring-1 ring-brand-500'
      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
  )

const MOTIVOS_ACTIVO = [
  {
    valor: 'Finalizado',
    titulo: 'Fin del contrato',
    detalle: 'Se cumplió el plazo o las partes lo terminan en la fecha pactada.',
  },
  {
    valor: 'Rescindido',
    titulo: 'Rescisión anticipada',
    detalle: 'El contrato termina antes de su fecha de fin.',
  },
]

/**
 * Cierre de un contrato (CU-010 y CU-011). Un contrato activo se finaliza o se rescinde, con
 * motivo y observaciones; uno programado se cancela. La página lo remonta con key al abrirlo.
 */
export default function CerrarContratoModal({ contrato, onConfirmar, onCancelar, loading, apilado = false }) {
  const [motivo, setMotivo] = useState('Finalizado')
  const [observaciones, setObservaciones] = useState('')

  if (!contrato) return null

  const esProgramado = contrato.estado === 'programado'
  const inquilino = contrato.inquilinos?.nombre_completo ?? 'el inquilino'
  const direccion = contrato.propiedades?.direccion ?? 'la propiedad'

  const confirmar = (e) => {
    e.preventDefault()
    onConfirmar({ motivo: esProgramado ? 'Cancelado' : motivo, observaciones })
  }

  return (
    <Modal open onClose={loading ? undefined : onCancelar} size="lg" layer={apilado ? 'stacked' : 'base'} labelledBy="cerrar-contrato-titulo">
      <ModalHeader
        titleId="cerrar-contrato-titulo"
        icon={IconClipboard}
        tone="warning"
        title={esProgramado ? 'Cancelar contrato programado' : 'Finalizar contrato'}
        subtitle={`${inquilino} · ${direccion}`}
        onClose={loading ? undefined : onCancelar}
      />
      <form onSubmit={confirmar} className="flex min-h-0 flex-1 flex-col">
        <ModalBody className="space-y-4">
          {esProgramado ? (
            <p className={calloutClass('warning')}>
              El contrato todavía no empezó: se cancela, la propiedad deja de estar Reservada y vuelve a Disponible.
            </p>
          ) : (
            <div>
              <span className={labelClass}>Motivo</span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {MOTIVOS_ACTIVO.map((m) => (
                  <button
                    key={m.valor}
                    type="button"
                    onClick={() => setMotivo(m.valor)}
                    className={opcionClass(motivo === m.valor)}
                    aria-pressed={motivo === m.valor}
                  >
                    <span>{m.titulo}</span>
                    <span className="text-xs font-normal text-slate-500">{m.detalle}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="cierre-observaciones" className={labelClass}>
              Observaciones
            </label>
            <textarea
              id="cierre-observaciones"
              rows={3}
              maxLength={500}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className={cn(textareaClass, 'resize-none')}
              placeholder={esProgramado ? 'Ej: El inquilino desistió antes de la firma.' : 'Ej: Entrega de llaves el 30/11, sin deudas.'}
            />
            <p className={fieldHintClass}>Opcional. Queda guardado en el contrato.</p>
          </div>

          {!esProgramado && (
            <p className="text-sm text-slate-600">
              La propiedad pasa a Disponible y el contrato deja de incluirse en aumentos. Su historial, sus pagos y
              sus documentos se conservan.
            </p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={onCancelar} disabled={loading}>
            Volver
          </Button>
          <Button type="submit" variant="warning" loading={loading}>
            {esProgramado ? 'Cancelar contrato' : motivo === 'Rescindido' ? 'Rescindir contrato' : 'Finalizar contrato'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
