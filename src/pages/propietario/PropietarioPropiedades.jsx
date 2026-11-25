import { useNavigate } from 'react-router-dom'
import PortalPageHeader from '../../components/inquilino/PortalPageHeader'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { IconBuilding } from '../../components/icons/Icons'
import { usePortalPropietario } from '../../contexts/PortalPropietarioContext'
import { BADGE_PROPIEDAD_ESTADO, BADGE_PROPIEDAD_ESTADO_DEFAULT } from '../../utils/adminModuleUi'
import {
  portalCardClass,
  portalEmptyState,
  portalErrorState,
  portalLoadingState,
  portalPageShell,
} from '../../utils/portalInquilinoUi'
import { iconTileClass } from '../../utils/ui'

const formatMonto = (monto) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(monto) || 0)

const formatFecha = (iso) => {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/** Listado de las propiedades del propietario con su estado y el contrato vigente. */
export default function PropietarioPropiedades() {
  const navigate = useNavigate()
  const { propiedades, contratos, loading, error, setContratoSeleccionado } = usePortalPropietario()

  if (loading) {
    return (
      <div className={portalLoadingState}>
        <p>Cargando tus propiedades…</p>
      </div>
    )
  }
  if (error) return <div className={portalErrorState}>{error}</div>

  const verAlquiler = (contratoId) => {
    setContratoSeleccionado(contratoId)
    navigate('/propietario/alquileres')
  }

  return (
    <div className={portalPageShell}>
      <PortalPageHeader title="Mis propiedades" subtitle="Estado de cada propiedad y su contrato vigente." />

      {propiedades.length === 0 ? (
        <div className={portalEmptyState}>
          <p className="text-sm font-medium text-slate-700">Todavía no hay propiedades a tu nombre.</p>
          <p className="mt-1 text-sm text-slate-500">La inmobiliaria las carga y aparecen acá.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {propiedades.map((p) => {
            const estado = BADGE_PROPIEDAD_ESTADO[p.estado] ?? { ...BADGE_PROPIEDAD_ESTADO_DEFAULT, label: p.estado }
            const delInmueble = contratos.filter((c) => c.propiedad_id === p.id)
            const vigente = delInmueble.find((c) => c.estado === 'activo')
            const finalizados = delInmueble.filter((c) => c.estado !== 'activo').length
            return (
              <article key={p.id} className={`${portalCardClass} flex flex-col gap-4 p-5`}>
                <div className="flex items-start gap-3">
                  <span className={iconTileClass('brand')}>
                    <IconBuilding className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug text-slate-900">{p.direccion}</p>
                    <p className="text-xs text-slate-500">{p.tipo}</p>
                  </div>
                  <Badge tone={estado.tone} dot>
                    {estado.label}
                  </Badge>
                </div>

                {vigente ? (
                  <dl className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50/80 p-3 text-sm ring-1 ring-inset ring-slate-200/70">
                    <div className="min-w-0">
                      <dt className="text-xs text-slate-500">Inquilino</dt>
                      <dd className="truncate font-medium text-slate-900">{vigente.inquilino_nombre ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Monto actual</dt>
                      <dd className="font-medium tabular-nums text-slate-900">{formatMonto(vigente.monto_alquiler)}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs text-slate-500">Vigencia</dt>
                      <dd className="text-slate-700">
                        {formatFecha(vigente.fecha_inicio)} al {formatFecha(vigente.fecha_fin)}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-sm text-slate-500">
                    {p.estado === 'Reservada' ? 'Tiene un contrato que empieza próximamente.' : 'Sin contrato vigente.'}
                  </p>
                )}

                <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-slate-500">
                    {finalizados > 0 ? `${finalizados} contrato${finalizados > 1 ? 's' : ''} finalizado${finalizados > 1 ? 's' : ''}` : ''}
                  </p>
                  {delInmueble.length > 0 && (
                    <Button variant="secondary" size="sm" onClick={() => verAlquiler((vigente ?? delInmueble[0]).id)}>
                      Ver alquiler
                    </Button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
