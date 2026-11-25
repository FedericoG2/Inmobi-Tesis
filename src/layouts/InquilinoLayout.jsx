import { Outlet } from 'react-router-dom'
import { PortalInquilinoProvider, usePortalInquilino } from '../contexts/PortalInquilinoContext'
import PortalBottomNav from '../components/portal/PortalBottomNav'
import PortalContratoSelector from '../components/portal/PortalContratoSelector'
import PortalHeader from '../components/portal/PortalHeader'
import { EncabezadoProvider } from '../contexts/EncabezadoContext'
import PortalSidebar from '../components/portal/PortalSidebar'
import { inquilinoNavItems } from '../components/inquilino/inquilinoNavItems'

function InquilinoLayoutContent() {
  const { inquilino, contratos, contratoSeleccionadoId, setContratoSeleccionado, loading } = usePortalInquilino()

  const selector = (variant) =>
    loading ? null : (
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
        items={inquilinoNavItems}
        subtitulo="Portal del inquilino"
        nombre={inquilino?.nombre_completo?.trim()}
        rolLabel="Inquilino"
      />

      <div className="flex min-h-screen flex-col lg:ml-64">
        <PortalHeader selector={selector} />

        <main className="w-full flex-1 px-4 pb-28 pt-5 sm:px-6 lg:pb-8">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>

      <PortalBottomNav items={inquilinoNavItems} />
    </div>
  )
}

export default function InquilinoLayout() {
  return (
    <PortalInquilinoProvider>
      <EncabezadoProvider>
        <InquilinoLayoutContent />
      </EncabezadoProvider>
    </PortalInquilinoProvider>
  )
}
