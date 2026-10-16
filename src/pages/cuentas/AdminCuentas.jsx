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
  AdminTableToolbar,
} from '../../components/admin/AdminDataTable'
import FilterSelect from '../../components/admin/FilterSelect'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { IconKey, IconLock, IconSearch, IconUser } from '../../components/icons/Icons'
import { useToast } from '../../contexts/ToastContext'
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
import { calloutClass, cn, inputClass } from '../../utils/ui'

const TONO_ROL = {
  admin: 'neutral',
  encargado: 'brand',
  inquilino: 'success',
}

function formatoFecha(iso) {
  if (!iso) return 'Nunca'
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function AdminCuentas() {
  const { user } = useAuth()
  const toast = useToast()
  const [cuentas, setCuentas] = useState([])
  const [inquilinosSinCuenta, setInquilinosSinCuenta] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
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
    toast.success(mensajeOk.titulo, mensajeOk.detalle)
    await cargar()
    return resultado
  }

  const confirmarBloqueo = async () => {
    const { cuenta } = modal
    setProcesando(true)
    const resultado = await ejecutar(
      () => bloquearCuenta({ userId: cuenta.id, bloquear: !cuenta.bloqueado }),
      cuenta.bloqueado
        ? { titulo: 'Cuenta desbloqueada', detalle: `${cuenta.email} ya puede volver a iniciar sesión.` }
        : { titulo: 'Cuenta bloqueada', detalle: `${cuenta.email} no puede iniciar sesión hasta que la desbloquees.` }
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
      alerts={error ? <div className={calloutClass('danger')}>{error}</div> : null}
    >
      <AdminTableToolbar>
        <div className="relative min-w-0 flex-1">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className={cn(inputClass, 'pl-9')}
            placeholder="Buscar por email o inquilino…"
          />
        </div>
        <FilterSelect
          id="filtro-rol-cuenta"
          value={filtroRol}
          onChange={(e) => setFiltroRol(e.target.value)}
          onClear={() => setFiltroRol('')}
          ariaLabel="Filtrar por rol"
          className="sm:w-56"
        >
          <option value="">Rol: Todos</option>
          {Object.entries(ROL_LABEL).map(([valor, label]) => (
            <option key={valor} value={valor}>
              {label}
            </option>
          ))}
        </FilterSelect>
      </AdminTableToolbar>

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
              <AdminTableEmptyCell colSpan={6}>Cargando cuentas…</AdminTableEmptyCell>
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
                      <Badge tone={TONO_ROL[cuenta.rol] ?? 'neutral'}>{ROL_LABEL[cuenta.rol]}</Badge>
                    ) : (
                      <Badge tone="warning">Sin rol</Badge>
                    )}
                  </AdminTableCell>
                  <AdminTableCell>{cuenta.inquilino?.nombre_completo ?? '—'}</AdminTableCell>
                  <AdminTableCell>
                    {cuenta.bloqueado ? (
                      <Badge tone="danger" dot>
                        Bloqueada
                      </Badge>
                    ) : (
                      <Badge tone="success" dot>
                        Activa
                      </Badge>
                    )}
                  </AdminTableCell>
                  <AdminTableCell className="tabular-nums">{formatoFecha(cuenta.ultimo_ingreso)}</AdminTableCell>
                  <AdminTableActionsCell className="!w-80">
                    {editable ? (
                      <>
                        <Button variant="secondary" size="sm" icon={IconUser} onClick={() => setModal({ tipo: 'rol', cuenta })}>
                          Rol
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={IconKey}
                          onClick={() => setModal({ tipo: 'password', cuenta })}
                        >
                          Contraseña
                        </Button>
                        <Button
                          variant={cuenta.bloqueado ? 'secondary' : 'dangerOutline'}
                          size="sm"
                          icon={IconLock}
                          onClick={() => setModal({ tipo: 'bloqueo', cuenta })}
                        >
                          {cuenta.bloqueado ? 'Desbloquear' : 'Bloquear'}
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-slate-500">
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
          onGuardar={(datos) =>
            ejecutar(() => crearCuenta(datos), {
              titulo: 'Cuenta creada',
              detalle: `${datos.email} ya puede iniciar sesión con el rol asignado.`,
            })
          }
        />
      )}
      {modal?.tipo === 'rol' && (
        <CambiarRolModal
          cuenta={modal.cuenta}
          inquilinosSinCuenta={inquilinosSinCuenta}
          onClose={cerrarModal}
          onGuardar={(datos) =>
            ejecutar(() => cambiarRolCuenta(datos), {
              titulo: 'Rol actualizado',
              detalle: `${modal.cuenta.email} ahora es ${ROL_LABEL[datos.rol] ?? datos.rol}.`,
            })
          }
        />
      )}
      {modal?.tipo === 'password' && (
        <RestablecerPasswordModal
          cuenta={modal.cuenta}
          onClose={cerrarModal}
          onGuardar={(datos) =>
            ejecutar(() => restablecerPasswordCuenta(datos), {
              titulo: 'Contraseña restablecida',
              detalle: `La nueva contraseña de ${modal.cuenta.email} ya está activa.`,
            })
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
