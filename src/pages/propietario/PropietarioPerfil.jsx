import { useAuth } from '../../contexts/AuthContext'
import { usePortalPropietario } from '../../contexts/PortalPropietarioContext'
import PortalPageHeader from '../../components/inquilino/PortalPageHeader'
import { PortalInfoCard, PortalInfoRow } from '../../components/inquilino/PortalInfoList'
import Badge from '../../components/ui/Badge'
import { formatearDniCuit, formatearTelefono } from '../../utils/normalizarContacto'
import {
  portalColHalf,
  portalErrorState,
  portalGridPage,
  portalLoadingState,
  portalPageShell,
} from '../../utils/portalInquilinoUi'

/** Datos del propietario tal como los cargó la inmobiliaria, y su acceso al portal. */
export default function PropietarioPerfil() {
  const { user } = useAuth()
  const { propietario, loading, error } = usePortalPropietario()

  if (loading) {
    return (
      <div className={portalLoadingState}>
        <p>Cargando tu perfil…</p>
      </div>
    )
  }
  if (error) return <div className={portalErrorState}>{error}</div>

  const esJuridica = propietario?.tipo_persona === 'Jurídica'

  return (
    <div className={portalPageShell}>
      <PortalPageHeader
        title="Mi perfil"
        subtitle="Tus datos los mantiene la inmobiliaria: si hay que corregir algo, comunicate con ella."
      />

      <div className={portalGridPage}>
        <PortalInfoCard titulo="Datos personales" className={portalColHalf}>
          <ul className="divide-y divide-slate-100">
            <PortalInfoRow label={esJuridica ? 'Razón social' : 'Nombre'} value={propietario?.nombre_completo} />
            <PortalInfoRow label={esJuridica ? 'CUIT' : 'DNI / CUIT'} value={formatearDniCuit(propietario?.dni_cuit)} />
            <PortalInfoRow label="Teléfono" value={formatearTelefono(propietario?.telefono)} />
            <PortalInfoRow label="Email de contacto" value={propietario?.email} />
          </ul>
        </PortalInfoCard>

        <PortalInfoCard titulo="Acceso al portal" className={portalColHalf}>
          <ul className="divide-y divide-slate-100">
            <PortalInfoRow label="Email de acceso" value={user?.email} />
            <PortalInfoRow label="Estado" value={<Badge tone="success" dot>Cuenta activa</Badge>} />
          </ul>
        </PortalInfoCard>
      </div>
    </div>
  )
}
