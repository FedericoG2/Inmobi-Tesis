import { useAuth } from '../../contexts/AuthContext'
import { usePortalInquilino } from '../../contexts/PortalInquilinoContext'
import PortalPageHeader from '../../components/inquilino/PortalPageHeader'
import { PortalInfoCard, PortalInfoRow } from '../../components/inquilino/PortalInfoList'
import { formatearDniCuit } from '../../utils/normalizarContacto'
import {
  portalColHalf,
  portalErrorState,
  portalGridPage,
  portalLoadingState,
  portalPageShell,
} from '../../utils/portalInquilinoUi'

export default function InquilinoPerfil() {
  const { user } = useAuth()
  const { inquilino, loading, error } = usePortalInquilino()

  if (loading) {
    return (
      <div className={portalLoadingState}>
        <p>Cargando tu perfil...</p>
      </div>
    )
  }

  if (error) {
    return <div className={portalErrorState}>{error}</div>
  }

  return (
    <div className={portalPageShell}>
      <PortalPageHeader title="Mi Perfil" subtitle="Datos personales y acceso al portal" />

      <div className={portalGridPage}>
        <PortalInfoCard titulo="Datos personales" className={portalColHalf}>
          <ul className="divide-y divide-slate-100">
            <PortalInfoRow label="Nombre" value={inquilino?.nombre_completo} />
            <PortalInfoRow label="DNI / CUIT" value={formatearDniCuit(inquilino?.dni_cuit)} />
            <PortalInfoRow label="Teléfono" value={inquilino?.telefono} />
          </ul>
        </PortalInfoCard>

        <PortalInfoCard titulo="Acceso al portal" className={portalColHalf}>
          <ul className="divide-y divide-slate-100">
            <PortalInfoRow label="Email de acceso" value={user?.email} />
            <PortalInfoRow label="Estado" value="Cuenta activa" />
          </ul>
        </PortalInfoCard>
      </div>
    </div>
  )
}
