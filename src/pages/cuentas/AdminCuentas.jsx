import { useCallback, useEffect, useMemo, useState } from 'react'
import AdminListLayout from '../../components/admin/AdminListLayout'
import AdminConfirmModal from '../../components/admin/AdminConfirmModal'
import {
  AdminTable,
  AdminTableActionsCell,
  AdminTableActionsHeaderCell,
  AdminTableBody,
  AdminTableCell,
  AdminTableEmptyCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from '../../components/admin/AdminDataTable'
import {
  CambiarRolModal,
  CrearCuentaModal,
  RestablecerPasswordModal,
} from '../../components/cuentas/CuentaModales'
import { useAuth } from '../../contexts/AuthContext'
import {
  ROL_LABEL,
  bloquearCuenta,
  cambiarRolCuenta,
  crearCuenta,
  listarCuentas,
  restablecerPasswordCuenta,
} from '../../services/cuentasService'
import { inputToolbarClass, selectToolbarClass } from '../../utils/adminModuleUi'

const BADGE_ROL = {
  admin: 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200',
  encargado: 'bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-200',
  inquilino: 'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200',
}

const botonAccion =
  'rounded-md px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40'

function formatoFecha(iso) {
  if (!iso) return 'Nunca'
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function AdminCuentas() {
  const { user } = useAuth()
  const [cuentas, setCuentas] = useState([])
  const [inquilinosSinCuenta, setInquilinosSinCuenta] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtroRol, setFiltroRol] = useState('')
  const [modal, setModal] = useState(null)
  const [procesando, setProcesando] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await listarCuentas()
    if (err) {
      setError(err.message)
    } else {
      setError('')
      setCuentas(data.cuentas ?? [])
      setInquilinosSinCuenta(data.inquilinosSinCuenta ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return cuentas
      .filter((c) => !filtroRol || c.rol === filtroRol)
      .filter(
        (c) =>
          !texto ||
          c.email?.toLowerCase().includes(texto) ||
          c.inquilino?.nombre_completo?.toLowerCase().includes(texto)
      )
      .sort((a, b) => (a.email ?? '').localeCompare(b.email ?? ''))
  }, [cuentas, busqueda, filtroRol])

  const cerrarModal = () => setModal(null)

  const ejecutar = async (accion, mensajeOk) => {
    const resultado = await accion()
    if (resultado.error) return resultado
    setModal(null)
    setAviso(mensajeOk)
    await cargar()
    return resultado
  }

  const confirmarBloqueo = async () => {
    const { cuenta } = modal
    setProcesando(true)
    const resultado = await ejecutar(
      () => bloquearCuenta({ userId: cuenta.id, bloquear: !cuenta.bloqueado }),
      cuenta.bloqueado ? `Cuenta ${cuenta.email} desbloqueada.` : `Cuenta ${cuenta.email} bloqueada.`
    )
    setProcesando(false)
    if (resultado.error) {
      setModal(null)
      setError(resultado.error.message)
    }
  }

  return (
    <AdminListLayout
      title="Cuentas"
      subtitle="Usuarios que ingresan al sistema: alta, rol, bloqueo y restablecimiento de contraseña."
      actionLabel="Nueva cuenta"
      onAction={() => setModal({ tipo: 'crear' })}
      alerts={
        (error || aviso) && (
          <div className="space-y-2">
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {aviso && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{aviso}</p>}
          </div>
        )
      }
    >
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row">
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className={inputToolbarClass}
          placeholder="Buscar por email o inquilino"
        />
        <select value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)} className={selectToolbarClass}>
          <option value="">Todos los roles</option>
          {Object.entries(ROL_LABEL).map(([valor, label]) => (
            <option key={valor} value={valor}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <AdminTable>
        <AdminTableHead>
          <AdminTableRow>
            <AdminTableHeaderCell>Email</AdminTableHeaderCell>
            <AdminTableHeaderCell>Rol</AdminTableHeaderCell>
            <AdminTableHeaderCell>Inquilino vinculado</AdminTableHeaderCell>
            <AdminTableHeaderCell>Estado</AdminTableHeaderCell>
            <AdminTableHeaderCell>Último ingreso</AdminTableHeaderCell>
            <AdminTableActionsHeaderCell className="!w-80" />
          </AdminTableRow>
        </AdminTableHead>
        <AdminTableBody>
          {loading ? (
            <AdminTableRow>
              <AdminTableEmptyCell colSpan={6}>Cargando cuentas...</AdminTableEmptyCell>
            </AdminTableRow>
          ) : filtradas.length === 0 ? (
            <AdminTableRow>
              <AdminTableEmptyCell colSpan={6}>No hay cuentas para mostrar.</AdminTableEmptyCell>
            </AdminTableRow>
          ) : (
            filtradas.map((cuenta) => {
              const editable = cuenta.id !== user?.id && cuenta.rol !== 'admin'
              return (
                <AdminTableRow key={cuenta.id}>
                  <AdminTableCell className="font-medium text-slate-900">{cuenta.email}</AdminTableCell>
                  <AdminTableCell>
                    {cuenta.rol ? (
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_ROL[cuenta.rol]}`}>
                        {ROL_LABEL[cuenta.rol]}
                      </span>
                    ) : (
                      <span className="text-xs text-amber-700">Sin rol</span>
                    )}
                  </AdminTableCell>
                  <AdminTableCell>{cuenta.inquilino?.nombre_completo ?? '—'}</AdminTableCell>
                  <AdminTableCell>
                    {cuenta.bloqueado ? (
                      <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200">
                        Bloqueada
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200">
                        Activa
                      </span>
                    )}
                  </AdminTableCell>
                  <AdminTableCell className="tabular-nums">{formatoFecha(cuenta.ultimo_ingreso)}</AdminTableCell>
                  <AdminTableActionsCell className="!w-80">
                    {editable ? (
                      <>
                        <button type="button" className={botonAccion} onClick={() => setModal({ tipo: 'rol', cuenta })}>
                          Rol
                        </button>
                        <button
                          type="button"
                          className={botonAccion}
                          onClick={() => setModal({ tipo: 'password', cuenta })}
                        >
                          Contraseña
                        </button>
                        <button
                          type="button"
                          className={botonAccion}
                          onClick={() => setModal({ tipo: 'bloqueo', cuenta })}
                        >
                          {cuenta.bloqueado ? 'Desbloquear' : 'Bloquear'}
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">
                        {cuenta.id === user?.id ? 'Tu cuenta' : 'Sin acciones'}
                      </span>
                    )}
                  </AdminTableActionsCell>
                </AdminTableRow>
              )
            })
          )}
        </AdminTableBody>
      </AdminTable>

      {modal?.tipo === 'crear' && (
        <CrearCuentaModal
          inquilinosSinCuenta={inquilinosSinCuenta}
          onClose={cerrarModal}
          onGuardar={(datos) => ejecutar(() => crearCuenta(datos), `Cuenta ${datos.email} creada.`)}
        />
      )}
      {modal?.tipo === 'rol' && (
        <CambiarRolModal
          cuenta={modal.cuenta}
          inquilinosSinCuenta={inquilinosSinCuenta}
          onClose={cerrarModal}
          onGuardar={(datos) => ejecutar(() => cambiarRolCuenta(datos), `Rol de ${modal.cuenta.email} actualizado.`)}
        />
      )}
      {modal?.tipo === 'password' && (
        <RestablecerPasswordModal
          cuenta={modal.cuenta}
          onClose={cerrarModal}
          onGuardar={(datos) =>
            ejecutar(() => restablecerPasswordCuenta(datos), `Contraseña de ${modal.cuenta.email} restablecida.`)
          }
        />
      )}
      <AdminConfirmModal
        open={modal?.tipo === 'bloqueo'}
        title={modal?.cuenta?.bloqueado ? 'Desbloquear cuenta' : 'Bloquear cuenta'}
        message={
          modal?.cuenta?.bloqueado
            ? `${modal?.cuenta?.email} va a poder volver a iniciar sesión.`
            : `${modal?.cuenta?.email} no va a poder iniciar sesión hasta que la desbloquees.`
        }
        confirmLabel={modal?.cuenta?.bloqueado ? 'Desbloquear' : 'Bloquear'}
        confirmVariant={modal?.cuenta?.bloqueado ? 'important' : 'danger'}
        loading={procesando}
        onConfirm={confirmarBloqueo}
        onCancel={cerrarModal}
      />
    </AdminListLayout>
  )
}
