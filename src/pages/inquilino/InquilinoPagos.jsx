import { useState } from 'react'
import { useConsulta } from '../../hooks/useConsulta'
import { useToast } from '../../contexts/ToastContext'
import { usePortalInquilino } from '../../contexts/PortalInquilinoContext'
import PortalPageHeader from '../../components/inquilino/PortalPageHeader'
import ComprobantePagoFormModal from '../../components/alquileres/ComprobantePagoFormModal'
import PeriodosPagoLista from '../../components/alquileres/PeriodosPagoLista'
import Button from '../../components/ui/Button'
import { IconUpload } from '../../components/icons/Icons'
import { listarPeriodosContrato, registrarComprobantePago } from '../../services/alquileresService'
import { accionesPeriodo, nombrePeriodo, resumenPagos } from '../../utils/alquileresUi'
import { hoyIsoLocal } from '../../utils/contratoVigencia'
import {
  portalCardClass,
  portalEmptyState,
  portalErrorState,
  portalLoadingState,
  portalPageShell,
  portalSection,
  portalSectionTitle,
} from '../../utils/portalInquilinoUi'
import { calloutClass, eyebrow } from '../../utils/ui'

const formatMonto = (monto) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(monto) || 0)

function Indicador({ label, valor }) {
  return (
    <div className={`${portalCardClass} p-4`}>
      <p className={eyebrow}>{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{valor}</p>
    </div>
  )
}

/** Períodos de alquiler del contrato elegido, su estado de pago y los comprobantes del inquilino. */
export default function InquilinoPagos() {
  const toast = useToast()
  const { contratoActivo: contrato, loading, error, versionPagos } = usePortalInquilino()
  const [formPeriodo, setFormPeriodo] = useState(null)

  const consulta = useConsulta(contrato ? [contrato.id, versionPagos] : null, () => listarPeriodosContrato(contrato.id))
  const periodos = consulta.data ?? []
  const hoy = hoyIsoLocal()
  const resumen = resumenPagos(periodos, hoy)
  const contratoVigente = contrato?.estado === 'activo'

  if (loading) {
    return (
      <div className={portalLoadingState}>
        <p>Cargando tus pagos…</p>
      </div>
    )
  }

  if (error) return <div className={portalErrorState}>{error}</div>

  const guardarComprobante = async (datos) => {
    const resultado = await registrarComprobantePago(datos)
    if (resultado.error) return resultado
    toast.success(
      'Comprobante enviado',
      `La inmobiliaria va a revisar el pago de ${nombrePeriodo(formPeriodo.periodo)} y confirmarlo.`
    )
    setFormPeriodo(null)
    consulta.recargar()
    return resultado
  }

  const renderAcciones = (periodo) =>
    accionesPeriodo(periodo, { rol: 'inquilino', contratoActivo: contratoVigente }).registrarComprobante ? (
      <Button variant="secondary" size="sm" icon={IconUpload} onClick={() => setFormPeriodo(periodo)}>
        {periodo.comprobantes_pago?.length ? 'Agregar comprobante' : 'Registrar comprobante'}
      </Button>
    ) : null

  return (
    <div className={portalPageShell}>
      <PortalPageHeader
        title="Pagos"
        subtitle={
          contrato
            ? `${contrato.propiedades?.direccion ?? 'Tu alquiler'} · un período por mes`
            : 'Períodos de alquiler y comprobantes de pago.'
        }
      />

      {!contrato ? (
        <div className={portalEmptyState}>
          <p className="text-sm font-medium text-slate-700">No tenés contratos para mostrar.</p>
          <p className="mt-1 text-sm text-slate-500">Contactá a la inmobiliaria para más información.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Indicador label="Pagados" valor={`${resumen.pagados} de ${resumen.total}`} />
            <Indicador label="En revisión" valor={resumen.enRevision} />
            <Indicador label="Pendientes" valor={resumen.pendientes} />
            <Indicador label="Saldo pendiente" valor={formatMonto(resumen.montoPendiente)} />
          </div>

          <p className={calloutClass(contratoVigente ? 'info' : 'neutral')}>
            {contratoVigente
              ? 'Registrá el comprobante de cada pago en su período. El período figura como Pagado cuando la inmobiliaria revisa el comprobante y confirma el pago. Los comprobantes quedan guardados y no se pueden modificar ni eliminar.'
              : 'Este contrato está finalizado: podés consultar sus pagos y comprobantes, pero no registrar comprobantes nuevos.'}
          </p>

          <section className={portalSection}>
            <h2 className={portalSectionTitle}>Períodos de alquiler</h2>
            {consulta.cargandoPrimeraVez ? (
              <div className={`${portalCardClass} px-4 py-6 text-center text-sm text-slate-500`}>Cargando períodos…</div>
            ) : consulta.error ? (
              <div className={calloutClass('danger')}>No se pudieron cargar los pagos: {consulta.error.message}</div>
            ) : (
              <PeriodosPagoLista
                periodos={periodos}
                renderAcciones={renderAcciones}
                vacio="Todavía no hay períodos de alquiler para este contrato."
              />
            )}
          </section>
        </>
      )}

      {formPeriodo && (
        <ComprobantePagoFormModal
          key={formPeriodo.id}
          periodo={formPeriodo}
          quienConfirma="la inmobiliaria lo revisa y confirma el pago del período."
          onClose={() => setFormPeriodo(null)}
          onGuardar={guardarComprobante}
        />
      )}
    </div>
  )
}
