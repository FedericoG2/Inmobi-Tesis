import { useRef, useState } from 'react'
import Modal, { ModalBody, ModalFooter, ModalHeader } from '../ui/Modal'
import Button from '../ui/Button'
import { IconPaperclip, IconUpload } from '../icons/Icons'
import { ACEPTA_COMPROBANTE, validarArchivoComprobante } from '../../services/alquileresService'
import { nombrePeriodo } from '../../utils/alquileresUi'
import { formatearMontoInput, parsearMontoInput } from '../../utils/formatoMonto'
import { hoyIsoLocal } from '../../utils/contratoVigencia'
import { calloutClass, cn, fieldErrorClass, fieldHintClass, inputClass, labelClass, textareaClass } from '../../utils/ui'

const formatMonto = (monto) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(monto) || 0)

/**
 * Alta de un comprobante de pago para un período Pendiente. Lo usan el Encargado de
 * Alquileres y el inquilino. Registrarlo no confirma el pago.
 */
export default function ComprobantePagoFormModal({ periodo, onClose, onGuardar, layer = 'base', quienConfirma }) {
  const [archivo, setArchivo] = useState(null)
  const [monto, setMonto] = useState(() => formatearMontoInput(periodo?.monto ?? ''))
  const [fechaPago, setFechaPago] = useState(hoyIsoLocal)
  const [observaciones, setObservaciones] = useState('')
  const [errorArchivo, setErrorArchivo] = useState(null)
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const inputRef = useRef(null)

  if (!periodo) return null

  const elegirArchivo = (e) => {
    const elegido = e.target.files?.[0] ?? null
    e.target.value = ''
    if (!elegido) return
    const validacion = validarArchivoComprobante(elegido)
    setErrorArchivo(validacion.error?.message ?? null)
    setArchivo(validacion.error ? null : elegido)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!archivo) {
      setErrorArchivo('Elegí el archivo del comprobante (PDF o imagen)')
      return
    }
    setGuardando(true)
    setError(null)
    const resultado = await onGuardar({
      periodoId: periodo.id,
      archivo,
      monto: parsearMontoInput(monto),
      fechaPago,
      observaciones,
    })
    if (resultado?.error) {
      setError(resultado.error.message)
      setGuardando(false)
    }
  }

  return (
    <Modal open onClose={guardando ? undefined : onClose} size="lg" layer={layer} labelledBy="comprobante-pago-titulo">
      <ModalHeader
        titleId="comprobante-pago-titulo"
        icon={IconUpload}
        title="Registrar comprobante de pago"
        subtitle={`${nombrePeriodo(periodo.periodo)} · ${formatMonto(periodo.monto)}`}
        onClose={guardando ? undefined : onClose}
      />
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <ModalBody className="space-y-4">
          <p className={calloutClass('info')}>
            El comprobante queda registrado en el período, pero el pago no se confirma solo:{' '}
            {quienConfirma ?? 'el Encargado de Alquileres lo revisa y confirma el pago del período.'}
          </p>

          <div>
            <span className={labelClass}>Archivo</span>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border border-dashed px-4 py-3 text-left text-sm transition',
                errorArchivo ? 'border-red-300 bg-red-50/40' : 'border-slate-300 hover:border-brand-400 hover:bg-brand-50/30'
              )}
            >
              <IconPaperclip className="h-5 w-5 shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-slate-800">
                  {archivo ? archivo.name : 'Elegir PDF o imagen'}
                </span>
                <span className="block text-xs text-slate-500">PDF, JPG, PNG o WEBP · hasta 10 MB</span>
              </span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept={ACEPTA_COMPROBANTE}
              onChange={elegirArchivo}
              className="sr-only"
              aria-label="Archivo del comprobante"
            />
            {errorArchivo && <p className={fieldErrorClass}>{errorArchivo}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="comprobante-monto" className={labelClass}>
                Monto pagado
              </label>
              <input
                id="comprobante-monto"
                inputMode="numeric"
                value={monto}
                onChange={(e) => setMonto(formatearMontoInput(e.target.value))}
                className={inputClass}
                placeholder="$ 0"
              />
              <p className={fieldHintClass}>Opcional. Por defecto, el monto del período.</p>
            </div>
            <div>
              <label htmlFor="comprobante-fecha" className={labelClass}>
                Fecha de pago
              </label>
              <input
                id="comprobante-fecha"
                type="date"
                value={fechaPago}
                max={hoyIsoLocal()}
                onChange={(e) => setFechaPago(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="comprobante-observaciones" className={labelClass}>
              Observaciones
            </label>
            <textarea
              id="comprobante-observaciones"
              rows={2}
              maxLength={500}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className={cn(textareaClass, 'min-h-0 resize-none')}
              placeholder="Ej: Transferencia desde la cuenta de mi pareja."
            />
          </div>

          {error && <p className={calloutClass('danger')}>{error}</p>}
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="submit" icon={IconUpload} loading={guardando}>
            Registrar comprobante
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
