import { useAuth } from '../../contexts/AuthContext'
import { usePortalInquilino } from '../../contexts/PortalInquilinoContext'
import { formatearDniCuit } from '../../utils/normalizarContacto'

function InfoFila({ label, value }) {
  return (
    <li className="flex items-center justify-between gap-4 px-5 py-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-medium text-slate-800">{value ?? '—'}</span>
    </li>
  )
}

export default function InquilinoPerfil() {
  const { user } = useAuth()
  const { inquilino, loading, error } = usePortalInquilino()

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-slate-500">Cargando tu perfil...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-slate-800">Mi Perfil</h2>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="border-b border-slate-100 px-5 py-4">
          <p className="text-sm font-semibold text-slate-800">Datos personales</p>
        </div>
        <ul className="divide-y divide-slate-100">
          <InfoFila label="Nombre" value={inquilino?.nombre_completo} />
          <InfoFila label="DNI / CUIT" value={formatearDniCuit(inquilino?.dni_cuit)} />
          <InfoFila label="Teléfono" value={inquilino?.telefono} />
          <InfoFila label="Email de acceso" value={user?.email} />
        </ul>
      </div>
    </div>
  )
}
