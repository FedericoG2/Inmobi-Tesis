import { useMemo, useState } from 'react'
import AdminListLayout from '../../components/admin/AdminListLayout'
import AdminTablePagination from '../../components/admin/AdminTablePagination'
import AlquilerDetalleModal from '../../components/admin/AlquilerDetalleModal'
import FilterSelect from '../../components/admin/FilterSelect'
import StatCard from '../../components/admin/StatCard'
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
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import IconButton from '../../components/ui/IconButton'
import { IconChevronLeft, IconChevronRight, IconEye, IconSearch } from '../../components/icons/Icons'
import { useAlquileresDelMes } from '../../hooks/useAlquileres'
import { usePaginacion } from '../../hooks/usePaginacion'
import {
  aumentoPendienteDelPeriodo,
  nombrePeriodo,
  ordenSituacion,
  rangoPeriodo,
  SITUACION_CORTA,
  SITUACION_PERIODO,
  situacionPeriodo,
} from '../../utils/alquileresUi'
import { etiquetaEstadoContrato, hoyIsoLocal } from '../../utils/contratoVigencia'
import { calloutClass, cn, inputClass } from '../../utils/ui'

const FILAS_POR_PAGINA = 6

const COL_ESTADO = 'w-[8rem]'
const COL_PERIODO = 'w-[10rem]'
const COL_VENCE = 'w-[6.5rem]'
const COL_INQUILINO = 'w-[10rem]'
const COL_MONTO = 'w-[9.5rem]'
const COL_ACCIONES = 'w-[4.5rem]'

const formatMonto = (monto) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(monto) || 0)

const formatFecha = (iso) => {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

const normalizar = (texto) =>
  String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')

const primerDiaMes = (iso) => `${iso.slice(0, 7)}-01`

function moverMes(mes, delta) {
  const [y, m] = mes.split('-').map(Number)
  const fecha = new Date(y, m - 1 + delta, 1)
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-01`
}

/**
 * Módulo de Alquileres (Encargado): los períodos de un mes, con su estado de pago. Se elige el mes
 * y el estado; "Ver" abre el historial de pagos del contrato para registrar comprobantes,
 * confirmar el pago o deshacer la confirmación.
 */
export default function AdminAlquileres() {
  const hoy = hoyIsoLocal()
  const [mes, setMes] = useState(() => primerDiaMes(hoy))
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [detalle, setDetalle] = useState(null)
  const { periodos, loading, error, refetch } = useAlquileresDelMes(mes)

  // Cada período con su situación, el aviso de aumento pendiente y los días que cubre.
  const filas = useMemo(
    () =>
      periodos
        .map((p) => ({
          ...p,
          situacion: situacionPeriodo(p, hoy),
          aumentoPendiente: aumentoPendienteDelPeriodo(p, p.contratos),
          rango: rangoPeriodo(p, p.contratos),
        }))
        .sort(
          (a, b) =>
            ordenSituacion(a.situacion) - ordenSituacion(b.situacion) ||
            (a.contratos?.inquilinos?.nombre_completo ?? '').localeCompare(b.contratos?.inquilinos?.nombre_completo ?? '')
        ),
    [periodos, hoy]
  )

  const indicadores = useMemo(
    () => ({
      total: filas.length,
      pendientes: filas.filter((f) => f.estado === 'Pendiente').length,
      porRevisar: filas.filter((f) => f.situacion === 'en_revision').length,
      cobrado: filas.filter((f) => f.estado === 'Pagado').reduce((acc, f) => acc + (Number(f.monto) || 0), 0),
    }),
    [filas]
  )

  const filtradas = useMemo(() => {
    const termino = normalizar(busqueda.trim())
    return filas.filter((f) => {
      if (filtroEstado === 'pendiente' && f.estado !== 'Pendiente') return false
      if (['en_revision', 'vencido', 'pagado'].includes(filtroEstado) && f.situacion !== filtroEstado) return false
      if (!termino) return true
      const c = f.contratos
      return [`#${c?.id}`, c?.inquilinos?.nombre_completo, c?.propiedades?.direccion, c?.propiedades?.propietarios?.nombre_completo].some(
        (valor) => normalizar(valor).includes(termino)
      )
    })
  }, [filas, busqueda, filtroEstado])

  const { pagina, totalPaginas, visibles, irAPagina } = usePaginacion(filtradas, FILAS_POR_PAGINA, [mes, busqueda, filtroEstado])

  const mensajeVacio = loading
    ? 'Cargando alquileres…'
    : filas.length === 0
      ? `No hay alquileres en ${nombrePeriodo(mes).toLowerCase()}: el primer cobro es el mes en que empieza cada contrato.`
      : 'No hay alquileres que coincidan con la búsqueda o el estado elegido.'

  return (
    <>
      <AdminListLayout
        title="Alquileres"
        subtitle="Un mes por vez: cada contrato vigente tiene un período por mes, desde el mes en que empieza. Elegí un mes posterior para registrar un pago adelantado."
        alerts={error ? <div className={calloutClass('danger')}>Error al cargar los alquileres: {error}</div> : null}
        summary={
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard compact label={`Alquileres de ${nombrePeriodo(mes).split(' ')[0].toLowerCase()}`} value={loading ? '…' : indicadores.total} icon="clipboard" theme="slate" />
            <StatCard compact label="Pendientes de pago" value={loading ? '…' : indicadores.pendientes} icon="calendar" theme="slate" />
            <StatCard
              compact
              label="Comprobantes por revisar"
              value={loading ? '…' : indicadores.porRevisar}
              icon="alert"
              theme={!loading && indicadores.porRevisar > 0 ? 'indigo' : 'slate'}
              hint="Pagos para confirmar"
              onClick={() => setFiltroEstado('en_revision')}
            />
            <StatCard compact label="Cobrado en el mes" value={loading ? '…' : formatMonto(indicadores.cobrado)} icon="check" theme="slate" />
          </div>
        }
      >
        <div className="flex flex-col gap-2 border-b border-slate-200/80 px-4 py-3 lg:flex-row lg:items-center lg:px-5">
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="secondary" size="icon" icon={IconChevronLeft} aria-label="Mes anterior" onClick={() => setMes((m) => moverMes(m, -1))} />
            <label htmlFor="alquileres-mes" className="sr-only">
              Mes
            </label>
            <input
              id="alquileres-mes"
              type="month"
              value={mes.slice(0, 7)}
              onChange={(e) => e.target.value && setMes(`${e.target.value}-01`)}
              className={cn(inputClass, 'w-44')}
            />
            <Button variant="secondary" size="icon" icon={IconChevronRight} aria-label="Mes siguiente" onClick={() => setMes((m) => moverMes(m, 1))} />
            {mes !== primerDiaMes(hoy) && (
              <Button variant="ghost" size="sm" onClick={() => setMes(primerDiaMes(hoy))}>
                Mes actual
              </Button>
            )}
          </div>
          <div className="relative min-w-0 flex-1">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por inquilino, inmueble, propietario o contrato…"
              aria-label="Buscar alquileres por inquilino, inmueble, propietario o número de contrato"
              className={cn(inputClass, 'pl-9')}
            />
          </div>
          <FilterSelect
            id="filtro-estado-pago"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            onClear={() => setFiltroEstado('todos')}
            clearValue="todos"
            ariaLabel="Filtrar por estado de pago"
            className="w-full shrink-0 lg:w-52"
          >
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Pendientes (todos)</option>
            <option value="vencido">Vencidos</option>
            <option value="en_revision">Comprobante en revisión</option>
            <option value="pagado">Pagados</option>
          </FilterSelect>
        </div>

        <AdminTable>
          <AdminTableHead>
            <AdminTableRow>
              <AdminTableHeaderCell className={COL_ESTADO}>Estado</AdminTableHeaderCell>
              <AdminTableHeaderCell className={COL_PERIODO} data-tarjeta="titulo">
                Período
              </AdminTableHeaderCell>
              <AdminTableHeaderCell className={COL_VENCE}>Vencimiento</AdminTableHeaderCell>
              <AdminTableHeaderCell className={COL_INQUILINO}>Inquilino</AdminTableHeaderCell>
              <AdminTableHeaderCell className="min-w-0">Inmueble</AdminTableHeaderCell>
              <AdminTableHeaderCell className={COL_MONTO}>Monto</AdminTableHeaderCell>
              <AdminTableActionsHeaderCell className={COL_ACCIONES} />
            </AdminTableRow>
          </AdminTableHead>
          <AdminTableBody>
            {(loading || filtradas.length === 0) && (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={7}>{mensajeVacio}</AdminTableEmptyCell>
              </AdminTableRow>
            )}
            {!loading &&
              visibles.map((f) => {
                const c = f.contratos
                const situacion = SITUACION_PERIODO[f.situacion]
                return (
                  <AdminTableRow key={f.id}>
                    <AdminTableCell className={COL_ESTADO}>
                      <Badge tone={situacion.tone} dot>
                        {SITUACION_CORTA[f.situacion]}
                      </Badge>
                    </AdminTableCell>
                    <AdminTableCell className={`${COL_PERIODO} font-medium text-slate-900`}>
                      <span className="block">{nombrePeriodo(f.periodo)}</span>
                      {f.rango && (
                        <span className="block text-xs font-normal tabular-nums text-slate-500">
                          {formatFecha(f.rango.desde)} → {formatFecha(f.rango.hasta)}
                        </span>
                      )}
                    </AdminTableCell>
                    <AdminTableCell className={`${COL_VENCE} tabular-nums`}>{formatFecha(f.fecha_vencimiento)}</AdminTableCell>
                    <AdminTableCell className={`${COL_INQUILINO} text-slate-900`}>
                      <span className="line-clamp-2" title={c?.inquilinos?.nombre_completo ?? undefined}>
                        {c?.inquilinos?.nombre_completo ?? '—'}
                      </span>
                    </AdminTableCell>
                    <AdminTableCell className="min-w-0">
                      <span className="line-clamp-2" title={c?.propiedades?.direccion ?? undefined}>
                        {c?.propiedades?.direccion ?? '—'}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        Contrato {etiquetaEstadoContrato(c).toLowerCase()} · {c?.propiedades?.propietarios?.nombre_completo ?? 'sin propietario'}
                      </span>
                    </AdminTableCell>
                    <AdminTableCell className={`${COL_MONTO} tabular-nums text-slate-900`}>
                      <span className="block">{formatMonto(f.monto)}</span>
                      {f.aumentoPendiente && f.estado === 'Pendiente' && (
                        <span className="block text-xs font-medium text-amber-700">Falta aplicar el aumento</span>
                      )}
                    </AdminTableCell>
                    <AdminTableActionsCell className={COL_ACCIONES}>
                      <IconButton label="Ver pagos" icon={IconEye} tone="brand" onClick={() => setDetalle(f)} />
                    </AdminTableActionsCell>
                  </AdminTableRow>
                )
              })}
          </AdminTableBody>
        </AdminTable>

        <AdminTablePagination
          pagina={pagina}
          totalPaginas={totalPaginas}
          totalItems={filtradas.length}
          itemsPorPagina={FILAS_POR_PAGINA}
          onPaginaChange={irAPagina}
        />
      </AdminListLayout>

      {detalle && (
        <AlquilerDetalleModal
          key={detalle.id}
          alquiler={detalle.contratos}
          periodoDestacadoId={detalle.id}
          onClose={() => setDetalle(null)}
          onCambio={refetch}
        />
      )}
    </>
  )
}
