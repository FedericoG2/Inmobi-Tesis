import { Link, useNavigate } from 'react-router-dom'
import PortalPageHeader from '../../components/inquilino/PortalPageHeader'
import Badge from '../../components/ui/Badge'
import { IconArrowRight } from '../../components/icons/Icons'
import { usePortalPropietario } from '../../contexts/PortalPropietarioContext'
import { nombrePeriodo, resumenPagos, SITUACION_PERIODO, situacionPeriodo } from '../../utils/alquileresUi'
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
import { cn, eyebrow } from '../../utils/ui'

const formatMonto = (monto) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(monto) || 0)

function Indicador({ label, valor, detalle }) {
  return (
    <div className={`${portalCardClass} p-4`}>
      <p className={eyebrow}>{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900 lg:text-2xl">{valor}</p>
      {detalle && <p className="mt-0.5 text-xs text-slate-500">{detalle}</p>}
    </div>
  )
}

/** Resumen del propietario: sus propiedades, sus alquileres vigentes y el pago del mes de cada uno. */
export default function PropietarioInicio() {
  const navigate = useNavigate()
  const { propietario, propiedades, contratos, loading, error, setContratoSeleccionado } = usePortalPropietario()

  if (loading) {
    return (
      <div className={portalLoadingState}>
        <p>Cargando tus propiedades…</p>
      </div>
    )
  }
  if (error) return <div className={portalErrorState}>{error}</div>

  const hoy = hoyIsoLocal()
  const mesActual = `${hoy.slice(0, 7)}-01`
  const vigentes = contratos.filter((c) => c.estado === 'activo')
  const ingresoMensual = vigentes.reduce((acc, c) => acc + (Number(c.monto_alquiler) || 0), 0)
  const pendientes = vigentes.reduce((acc, c) => acc + resumenPagos(c.periodos_alquiler, hoy).pendientes, 0)

  const verAlquiler = (contratoId) => {
    setContratoSeleccionado(contratoId)
    navigate('/propietario/alquileres')
  }

  return (
    <div className={portalPageShell}>
      <PortalPageHeader
        title={`Hola, ${propietario?.nombre_completo?.split(' ')[0] ?? ''}`.trim()}
        subtitle="Resumen de tus propiedades y de los alquileres que administra la inmobiliaria."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador label="Propiedades" valor={propiedades.length} />
        <Indicador
          label="Alquiladas"
          valor={propiedades.filter((p) => p.estado === 'Alquilada').length}
          detalle={`${propiedades.filter((p) => p.estado === 'Disponible').length} disponibles`}
        />
        <Indicador label="Ingreso mensual" valor={formatMonto(ingresoMensual)} detalle="Contratos vigentes" />
        <Indicador label="Períodos pendientes" valor={pendientes} detalle="Sin pago confirmado" />
      </div>

      <section className={portalSection}>
        <h2 className={portalSectionTitle}>Pagos de {nombrePeriodo(mesActual).toLowerCase()}</h2>
        {vigentes.length === 0 ? (
          <div className={portalEmptyState}>
            <p className="text-sm font-medium text-slate-700">No tenés alquileres vigentes.</p>
            <p className="mt-1 text-sm text-slate-500">Cuando una propiedad se alquile, vas a ver acá el estado de cada pago.</p>
          </div>
        ) : (
          <ul className={cn(portalCardClass, 'divide-y divide-slate-100 overflow-hidden')}>
            {vigentes.map((c) => {
              const periodo = c.periodos_alquiler?.find((p) => p.periodo === mesActual)
              const situacion = periodo ? SITUACION_PERIODO[situacionPeriodo(periodo, hoy)] : null
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => verAlquiler(c.id)}
                    className="group flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50 lg:px-5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{c.propiedades?.direccion ?? '—'}</p>
                      <p className="truncate text-xs text-slate-500">
                        {c.inquilino_nombre ?? 'Inquilino'} · {formatMonto(periodo?.monto ?? c.monto_alquiler)}
                      </p>
                    </div>
                    {situacion && (
                      <Badge tone={situacion.tone} dot>
                        {situacion.label}
                      </Badge>
                    )}
                    <IconArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <p className="text-sm text-slate-500">
        La inmobiliaria registra y confirma los pagos. Ante cualquier consulta sobre un alquiler, comunicate con ella.{' '}
        <Link to="/propietario/propiedades" className="font-medium text-brand-600 hover:text-brand-800">
          Ver mis propiedades
        </Link>
      </p>
    </div>
  )
}
