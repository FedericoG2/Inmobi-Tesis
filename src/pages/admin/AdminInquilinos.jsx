import { useEffect, useState } from 'react'
import { Badge, Card } from '@tremor/react'
import AdminAlertModal from '../../components/admin/AdminAlertModal'
import AdminListLayout from '../../components/admin/AdminListLayout'
import {
  AdminTable,
  AdminTableBody,
  AdminTableActionsCell,
  AdminTableActionsHeaderCell,
  AdminTableCell,
  AdminTableEmptyCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from '../../components/admin/AdminDataTable'
import InquilinoFormModal from '../../components/admin/forms/InquilinoFormModal'
import TableRowActions from '../../components/admin/TableRowActions'
import { useInquilinos } from '../../hooks/useInquilinos'

const alertaInicial = { open: false, titulo: 'Atención', mensaje: '' }

const MAPPING_GARANTIAS = {
  'Propietaria': { label: 'Propietaria', color: 'indigo' },
  'Recibos de Sueldo': { label: 'Recibo Sueldo', color: 'sky' },
  'Aval Bancario': { label: 'Aval Bancario', color: 'blue' },
  'Otro': { label: 'Otro / Caución', color: 'teal' },
}

const GARANTIAS_OPTIONS = [
  { id: 'Propietaria', label: 'Garantía Propietaria' },
  { id: 'Recibos de Sueldo', label: 'Recibo de Sueldo' },
  { id: 'Aval Bancario', label: 'Aval Bancario' },
  { id: 'Otro', label: 'Otro' },
]

export default function AdminInquilinos() {
  const [modalOpen, setModalOpen] = useState(false)
  const [inquilinoEditando, setInquilinoEditando] = useState(null)
  const [alerta, setAlerta] = useState(alertaInicial)

  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroGarantia, setFiltroGarantia] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')

  const {
    inquilinos, 
    loading,
    error,
    crear,
    actualizar,
    eliminar,
    contarContratosPorInquilino,
    submitting,
    submitError,
    limpiarSubmitError,
    actionError,
    limpiarActionError,
    mensajeContratosAsociados,
  } = useInquilinos()

  useEffect(() => {
    if (!actionError) return
    setAlerta({
      open: true,
      titulo: 'No se puede eliminar',
      mensaje: actionError,
    })
    limpiarActionError()
  }, [actionError, limpiarActionError])

  const cerrarModal = () => {
    if (!submitting) {
      setModalOpen(false)
      setInquilinoEditando(null)
    }
  }

  const abrirModalCrear = () => {
    limpiarSubmitError()
    setInquilinoEditando(null)
    setModalOpen(true)
  }

  const abrirModalEditar = (inquilino) => {
    limpiarSubmitError()
    setInquilinoEditando(inquilino)
    setModalOpen(true)
  }

  const handleSubmit = async (form) => {
    if (inquilinoEditando) {
      return actualizar(inquilinoEditando.id, form)
    }
    return crear(form)
  }

  const cerrarAlerta = () => {
    setAlerta(alertaInicial)
  }

  const handleEliminar = async (inquilino) => {
    limpiarActionError()
    const dependencias = await contarContratosPorInquilino(inquilino.id)

    if (dependencias.error) {
      setAlerta({ open: true, titulo: 'Error', mensaje: dependencias.error.message })
      return
    }

    if (dependencias.contratos > 0) {
      setAlerta({ open: true, titulo: 'No se puede eliminar', mensaje: mensajeContratosAsociados })
      return
    }

    const confirmar = window.confirm('¿Estás seguro de que querés eliminar a este inquilino?')
    if (!confirmar) return

    await eliminar(inquilino.id)
  }

  const inquilinosProcesados = (inquilinos || []).filter((i) => {
    const busqueda = filtroTexto.toLowerCase().trim()
    
    const cumpleTexto =
      !busqueda ||
      (i.nombre_completo ?? '').toLowerCase().includes(busqueda) ||
      (i.dni_cuit ?? '').toLowerCase().includes(busqueda)

    const cumpleGarantia = !filtroGarantia || i.tipo_garantia === filtroGarantia
    const cumpleTipo = !filtroTipo || i.tipo_persona === filtroTipo

    return cumpleTexto && cumpleGarantia && cumpleTipo
  })

  // 🟢 ORDENAMIENTO EN MILISEGUNDOS PURAS (Resuelve la inversión visual)
  const inquilinosFiltrados = inquilinosProcesados.sort((a, b) => {
    const fechaA = a.created_at ? new Date(a.created_at).getTime() : 0
    const fechaB = b.created_at ? new Date(b.created_at).getTime() : 0
    return fechaA - fechaB
  })

  return (
    <>
      <AdminListLayout
        title="Inquilinos"
        subtitle="Base de datos de arrendatarios particulares y empresas con sus respectivas garantías"
        actionLabel="Nuevo inquilino"
        onAction={abrirModalCrear}
        alerts={
          error ? (
            <Card className="border border-red-200 bg-red-50">
              <p className="text-sm text-red-700">Error al cargar inquilinos: {error}</p>
            </Card>
          ) : null
        }
      >
        <div className="mb-6 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3 shadow-sm">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="search-texto" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Buscar</label>
            <input
              id="search-texto"
              type="text"
              placeholder="Nombre, DNI o CUIT..."
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-slate-50/50 px-3 py-2 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="search-tipo" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo de Cliente</label>
            <select
              id="search-tipo"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-all cursor-pointer focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">Todos los tipos</option>
              <option value="Física">Particular (Física)</option>
              <option value="Jurídica">Empresa (Jurídica)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="search-garantia" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Garantía</label>
            <select
              id="search-garantia"
              value={filtroGarantia}
              onChange={(e) => setFiltroGarantia(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-all cursor-pointer focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">Todas las garantías</option>
              {GARANTIAS_OPTIONS.map((gar) => (
                <option key={gar.id} value={gar.id}>{gar.label}</option>
              ))}
            </select>
          </div>
        </div>

        <AdminTable>
          <AdminTableHead>
            <AdminTableRow>
              <AdminTableHeaderCell>Nombre / Razón Social</AdminTableHeaderCell>
              <AdminTableHeaderCell>DNI / CUIT</AdminTableHeaderCell>
              <AdminTableHeaderCell>Contacto</AdminTableHeaderCell>
              <AdminTableHeaderCell>Tipo</AdminTableHeaderCell>
              <AdminTableHeaderCell>Garantía</AdminTableHeaderCell>
              <AdminTableHeaderCell>Email</AdminTableHeaderCell>
              <AdminTableActionsHeaderCell />
            </AdminTableRow>
          </AdminTableHead>
          <AdminTableBody>
            {loading && (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={7}>Cargando inquilinos...</AdminTableEmptyCell>
              </AdminTableRow>
            )}

            {!loading && !error && inquilinosFiltrados.length === 0 && (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={7}>
                  {(inquilinos || []).length === 0 
                    ? "No hay inquilinos cargados" 
                    : "Ningún inquilino coincide con los filtros"}
                </AdminTableEmptyCell>
              </AdminTableRow>
            )}

            {!loading &&
              inquilinosFiltrados.map((i) => {
                const esJuridica = i.tipo_persona === 'Jurídica'
                const garantiaInfo = MAPPING_GARANTIAS[i.tipo_garantia] ?? { label: i.tipo_garantia ?? 'Sin especificar', color: 'slate' }

                return (
                  <AdminTableRow key={i.id ?? i.dni_cuit}>
                    <AdminTableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">{i.nombre_completo}</span>
                        {i.ocupacion && (
                          <span className="text-xs text-slate-400 truncate max-w-[180px]">
                            {i.ocupacion}
                          </span>
                        )}
                      </div>
                    </AdminTableCell>

                    <AdminTableCell className="text-slate-500 font-mono text-xs">
                      {i.dni_cuit}
                    </AdminTableCell>

                    <AdminTableCell className="text-slate-700 text-sm font-medium">
                      {i.telefono}
                    </AdminTableCell>

                    <AdminTableCell>
                      <Badge color={esJuridica ? 'purple' : 'blue'}>
                        {esJuridica ? 'Empresa' : 'Particular'}
                      </Badge>
                    </AdminTableCell>

                    <AdminTableCell>
                      <Badge size="xs" color={garantiaInfo.color} variant="light">
                        {garantiaInfo.label}
                      </Badge>
                    </AdminTableCell>

                    <AdminTableCell className="text-slate-500 text-xs truncate max-w-[160px]">
                      {i.email ?? '—'}
                    </AdminTableCell>

                    <AdminTableActionsCell>
                      <TableRowActions
                        onEdit={() => abrirModalEditar(i)}
                        onDelete={() => handleEliminar(i)}
                      />
                    </AdminTableActionsCell>
                  </AdminTableRow>
                )
              })}
          </AdminTableBody>
        </AdminTable>
      </AdminListLayout>

      <InquilinoFormModal
        open={modalOpen}
        onClose={cerrarModal}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitError={submitError}
        inquilino={inquilinoEditando}
      />

      <AdminAlertModal
        open={alerta.open}
        title={alerta.titulo}
        message={alerta.mensaje}
        onClose={cerrarAlerta}
      />
    </>
  )
}