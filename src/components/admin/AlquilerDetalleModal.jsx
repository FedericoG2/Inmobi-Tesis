import { useState } from 'react'
import { useConsulta } from '../../hooks/useConsulta'
import { useToast } from '../../contexts/ToastContext'
import Modal, { ModalBody, ModalFooter, ModalHeader } from '../ui/Modal'
import Button from '../ui/Button'
import AdminConfirmModal from './AdminConfirmModal'
import ComprobantePagoFormModal from '../alquileres/ComprobantePagoFormModal'
import PeriodosPagoLista from '../alquileres/PeriodosPagoLista'
import { IconCheck, IconCurrency, IconUndo, IconUpload } from '../icons/Icons'
import {
  confirmarPagoPeriodo,
  deshacerPagoPeriodo,
  listarPeriodosContrato,
  registrarComprobantePago,
} from '../../services/alquileresService'
import { accionesPeriodo, aumentoPendienteDelPeriodo, nombrePeriodo, resumenPagos } from '../../utils/alquileresUi'
import { hoyIsoLocal } from '../../utils/contratoVigencia'
import { calloutClass, eyebrow, loadingStateClass } from '../../utils/ui'

const formatMonto = (monto) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(monto) || 0)

function Dato({ label, children }) {
  return (
    <div className="min-w-0 rounded-lg bg-slate-50/80 px-3 py-2.5 ring-1 ring-inset ring-slate-200/70">
      <p className={eyebrow}>{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold tabular-nums text-slate-900">{children}</p>
    </div>
  )
}

/**
 * Pagos de un contrato (Encargado de Alquileres): períodos, comprobantes, registro de
 * comprobantes, confirmación del pago y deshacer la confirmación.
 */
export default function AlquilerDetalleModal({ alquiler, periodoDestacadoId = null, onClose, onCambio }) {
  const toast = useToast()
  const [formPeriodo, setFormPeriodo] = useState(null)
  const [confirmacion, setConfirmacion] = useState(null)
  const [procesando, setProcesando] = useState(false)
  const [errorAccion, setErrorAccion] = useState(null)

  const contratoId = alquiler?.id ?? null
  const consulta = useConsulta(contratoId, () => listarPeriodosContrato(contratoId))
  const periodos = consulta.data ?? []
  const hoy = hoyIsoLocal()
  const resumen = resumenPagos(periodos, hoy)

  if (!alquiler) return null

  const inquilino = alquiler.inquilinos?.nombre_completo ?? 'Inquilino'
  const propiedad = alquiler.propiedades?.direccion ?? 'Propiedad'
  const propietario = alquiler.propiedades?.propietarios?.nombre_completo
  const contratoActivo = alquiler.estado === 'activo'

  const actualizar = () => {
    consulta.recargar()
    onCambio?.()
  }

  const guardarComprobante = async (datos) => {
    const resultado = await registrarComprobantePago(datos)
    if (resultado.error) return resultado
    toast.success('Comprobante registrado', `${nombrePeriodo(formPeriodo.periodo)} queda listo para confirmar el pago.`)
    setFormPeriodo(null)
    actualizar()
    return resultado
  }

  const ejecutarConfirmacion = async () => {
    const { tipo, periodo } = confirmacion
    setProcesando(true)
    setErrorAccion(null)
    const { error } = tipo === 'confirmar' ? await confirmarPagoPeriodo(periodo.id) : await deshacerPagoPeriodo(periodo.id)
    setProcesando(false)
    setConfirmacion(null)
    if (error) {
      setErrorAccion(error.message)
      return
    }
    if (tipo === 'confirmar') {
      toast.success('Pago confirmado', `${nombrePeriodo(periodo.periodo)} · ${inquilino} quedó Pagado.`)
    } else {
      toast.info('Confirmación deshecha', `${nombrePeriodo(periodo.periodo)} volvió a Pendiente.`)
    }
    actualizar()
  }

  const renderAcciones = (periodo) => {
    const aumentoPendiente = periodo.estado === 'Pendiente' ? aumentoPendienteDelPeriodo(periodo, alquiler) : null
    const puede = accionesPeriodo(periodo, { rol: 'encargado', contratoActivo, aumentoPendiente })
    const sinComprobante = !periodo.comprobantes_pago?.length
    return (
      <>
        {aumentoPendiente && (
          <span className="w-full text-xs font-medium text-amber-700 sm:w-auto">
            Falta confirmar el aumento de {nombrePeriodo(aumentoPendiente).toLowerCase()}
          </span>
        )}
        {puede.registrarComprobante && (
          <Button variant="secondary" size="sm" icon={IconUpload} onClick={() => setFormPeriodo(periodo)}>
            Registrar comprobante
          </Button>
        )}
        {periodo.estado === 'Pendiente' && (
          <Button
            size="sm"
            icon={IconCheck}
            disabled={!puede.confirmarPago}
            title={
              puede.confirmarPago
                ? undefined
                : aumentoPendiente
                  ? 'Primero hay que confirmar el aumento de ese mes'
                  : sinComprobante
                    ? 'Hace falta al menos un comprobante para confirmar el pago'
                    : undefined
            }
            onClick={() => setConfirmacion({ tipo: 'confirmar', periodo })}
          >
            Confirmar pago
          </Button>
        )}
        {puede.deshacerPago && (
          <Button variant="ghost" size="sm" icon={IconUndo} onClick={() => setConfirmacion({ tipo: 'deshacer', periodo })}>
            Deshacer
          </Button>
        )}
      </>
    )
  }

  const mensajeConfirmacion = confirmacion
    ? confirmacion.tipo === 'confirmar'
      ? `¿Confirmar el pago de ${nombrePeriodo(confirmacion.periodo.periodo)} (${formatMonto(confirmacion.periodo.monto)}) de ${inquilino}? El período pasa a Pagado y el inquilino y el propietario lo ven en su portal.`
      : `¿Deshacer la confirmación del pago de ${nombrePeriodo(confirmacion.periodo.periodo)}? El período vuelve a Pendiente y sus comprobantes se conservan.`
    : ''

  return (
    <>
      <Modal open onClose={onClose} size="3xl" labelledBy="alquiler-detalle-titulo">
        <ModalHeader
          titleId="alquiler-detalle-titulo"
          icon={IconCurrency}
          title={`${inquilino} · ${propiedad}`}
          subtitle={[
            propietario ? `Propietario: ${propietario}` : null,
            contratoActivo ? 'Contrato vigente' : 'Contrato finalizado',
          ]
            .filter(Boolean)
            .join(' · ')}
          onClose={onClose}
        />
        <ModalBody className="space-y-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Dato label="Monto actual">{formatMonto(alquiler.monto_alquiler)}</Dato>
            <Dato label="Pagados">
              {resumen.pagados} de {resumen.total}
            </Dato>
            <Dato label="Por revisar">{resumen.enRevision}</Dato>
            <Dato label="Saldo pendiente">{formatMonto(resumen.montoPendiente)}</Dato>
          </div>

          {errorAccion && <p className={calloutClass('danger')}>{errorAccion}</p>}

          <section className="space-y-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Historial de pagos</h3>
              <p className="text-xs text-slate-500">
                Un período por mes. El pago se confirma cuando el período tiene al menos un comprobante y el
                aumento de ese mes, si le corresponde, ya está confirmado.
              </p>
            </div>
            {consulta.cargandoPrimeraVez ? (
              <p className={loadingStateClass}>Cargando períodos…</p>
            ) : consulta.error ? (
              <p className={calloutClass('danger')}>No se pudieron cargar los períodos: {consulta.error.message}</p>
            ) : (
              <PeriodosPagoLista periodos={periodos} hoyIso={hoy} renderAcciones={renderAcciones} destacadoId={periodoDestacadoId} />
            )}
          </section>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </ModalFooter>
      </Modal>

      {formPeriodo && (
        <ComprobantePagoFormModal
          key={formPeriodo.id}
          periodo={formPeriodo}
          layer="stacked"
          quienConfirma="después confirmás el pago desde esta misma pantalla."
          onClose={() => setFormPeriodo(null)}
          onGuardar={guardarComprobante}
        />
      )}

      <AdminConfirmModal
        open={Boolean(confirmacion)}
        title={confirmacion?.tipo === 'confirmar' ? 'Confirmar pago' : 'Deshacer confirmación'}
        message={mensajeConfirmacion}
        confirmLabel={confirmacion?.tipo === 'confirmar' ? 'Confirmar pago' : 'Deshacer'}
        confirmVariant={confirmacion?.tipo === 'confirmar' ? 'important' : 'warning'}
        apilado
        loading={procesando}
        onConfirm={ejecutarConfirmacion}
        onCancel={() => setConfirmacion(null)}
      />
    </>
  )
}
