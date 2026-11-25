import { Outlet, useLocation } from 'react-router-dom'
import { PortalPropietarioProvider, usePortalPropietario } from '../contexts/PortalPropietarioContext'
import PortalBottomNav from '../components/portal/PortalBottomNav'
import PortalContratoSelector from '../components/portal/PortalContratoSelector'
import PortalHeader from '../components/portal/PortalHeader'
import { EncabezadoProvider } from '../contexts/EncabezadoContext'
import PortalSidebar from '../components/portal/PortalSidebar'
import { propietarioNavItems } from '../components/propietario/propietarioNavItems'

function PropietarioLayoutContent() {
  const { propietario, contratos, contratoSeleccionadoId, setContratoSeleccionado, loading } = usePortalPropietario()
  const { pathname } = useLocation()

  // El selector de contrato solo tiene sentido en la pantalla de Alquileres.
  const selector = (variant) =>
    loading || !pathname.startsWith('/propietario/alquileres') ? null : (
      <PortalContratoSelector
        contratos={contratos}
        valor={contratoSeleccionadoId}
        onCambiar={setContratoSeleccionado}
        variant={variant}
        className={variant === 'mobile' ? 'px-4 pb-3' : ''}
      />
    )

  return (
    <div className="min-h-screen bg-slate-50">
      <PortalSidebar
        items={propietarioNavItems}
        subtitulo="Portal del propietario"
        nombre={propietario?.nombre_completo?.trim()}
        rolLabel="Propietario"
      />

      <div className="flex min-h-screen flex-col lg:ml-64">
        <PortalHeader selector={selector} />

        <main className="w-full flex-1 px-4 pb-28 pt-5 sm:px-6 lg:pb-8">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>

      <PortalBottomNav items={propietarioNavItems} />
    </div>
  )
}

export default function PropietarioLayout() {
  return (
    <PortalPropietarioProvider>
      <EncabezadoProvider>
        <PropietarioLayoutContent />
      </EncabezadoProvider>
    </PortalPropietarioProvider>
  )
}
