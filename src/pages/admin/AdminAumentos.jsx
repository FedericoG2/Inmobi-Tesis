import { useMemo, useState } from 'react'
import { Badge, Button, Card } from '@tremor/react'
import AdminConfirmModal from '../../components/admin/AdminConfirmModal'
import AdminListLayout from '../../components/admin/AdminListLayout'
import {
  AdminTable,
  AdminTableBody,
  AdminTableCell,
  AdminTableEmptyCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from '../../components/admin/AdminDataTable'
import { useAumentos } from '../../hooks/useAumentos'
import { periodicidadLabelPorMeses } from '../../utils/contratoAumentosPreview'

const formatMonto = (monto) => {
  if (monto == null) return '—'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(monto)
}

const formatFecha = (fecha) => {
  if (!fecha) return '—'
  const [year, month, day] = fecha.split('-')
  return `${day}/${month}/${year}`
}

const estadoBadge = {
  ok: { color: 'emerald', label: 'OK' },
  falta_indice: { color: 'amber', label: 'Falta índice' },
}

function formatMesAnio(ym) {
  if (!ym) return '—'
  const [year, month] = ym.split('-')
  return `${month}/${year}`
}

function detalleIndice(propuesta) {
  if (propuesta.indice_tipo === 'ipc') {
    if (propuesta.ipc_meses != null) {
      return `${propuesta.ipc_meses} meses IPC`
    }
    return 'IPC'
  }
  if (propuesta.indice_valor_inicio != null && propuesta.indice_valor_fin != null) {
    return `${propuesta.indice_valor_inicio} → ${propuesta.indice_valor_fin}`
  }
  return '—'
}

function resumenSync(syncInfo) {
  if (!syncInfo) return null
  const partes = []

  if (syncInfo.icl?.filas > 0) {
    partes.push(
      `ICL: ${syncInfo.icl.filas} días (${formatFecha(syncInfo.icl.desde)} → ${formatFecha(syncInfo.icl.hasta)})`
    )
  } else if (syncInfo.icl?.mensaje) {
    partes.push(`ICL: ${syncInfo.icl.mensaje}`)
  }

  if (syncInfo.ipc?.filas > 0) {
    partes.push(
      `IPC: ${syncInfo.ipc.filas} meses (${formatMesAnio(syncInfo.ipc.desde)} → ${formatMesAnio(syncInfo.ipc.hasta)})`
    )
  } else if (syncInfo.ipc?.mensaje) {
    partes.push(`IPC: ${syncInfo.ipc.mensaje}`)
  }

  if (partes.length === 0 && syncInfo.filas > 0 && syncInfo.desde) {
    partes.push(
      `ICL: ${syncInfo.filas} días (${formatFecha(syncInfo.desde)} → ${formatFecha(syncInfo.hasta)})`
    )
  }

  return partes.length ? partes.join(' · ') : null
}

function etiquetaCola(item) {
  if (item.es_vencido) {
    if (item.dias === 0) return 'Vence hoy'
    if (item.dias === 1) return 'Vencido hace 1 día'
    return `Vencido hace ${item.dias} días`
  }
  if (item.dias === 0) return 'Vence hoy'
  if (item.dias === 1) return 'En 1 día'
  return `En ${item.dias} días`
}

const FILTRO_COLA = [
  { value: 'todos', label: 'Todos' },
  { value: 'vencidos', label: 'Vencidos' },
  { value: 'proximos', label: 'Próximos 30 d' },
]

export default function AdminAumentos() {
  const [filtroCola, setFiltroCola] = useState('todos')
  const [incluirProximos, setIncluirProximos] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState([])

  const {
    cola,
    colaLoading,
    propuestas,
    meta,
    syncInfo,
    syncWarning,
    calculando,
    confirmando,
    error,
    calcularPendientes,
    confirmarSeleccionados,
    limpiarError,
    setPropuestas,
  } = useAumentos()

  const confirmables = useMemo(
    () => propuestas.filter((p) => p.confirmable),
    [propuestas]
  )

  const contratosListado = useMemo(() => {
    const items = cola?.items ?? []
    if (filtroCola === 'vencidos') return items.filter((i) => i.es_vencido)
    if (filtroCola === 'proximos') return items.filter((i) => !i.es_vencido)
    return items
  }, [cola?.items, filtroCola])

  const conteosCola = useMemo(
    () => ({
      todos: cola?.items?.length ?? 0,
      vencidos: cola?.vencidos?.length ?? 0,
      proximos: cola?.proximos?.length ?? 0,
    }),
    [cola?.items?.length, cola?.vencidos?.length, cola?.proximos?.length]
  )

  const mensajeListadoVacio = useMemo(() => {
    if (colaLoading) return 'Cargando…'
    if ((cola?.items.length ?? 0) === 0) {
      return 'No hay contratos ICL/IPC vencidos ni con aumento en los próximos 30 días'
    }
    if (filtroCola === 'vencidos') return 'No hay contratos vencidos con este filtro'
    if (filtroCola === 'proximos') return 'No hay contratos con aumento en los próximos 30 días'
    return 'Sin contratos para mostrar'
  }, [colaLoading, cola?.items.length, filtroCola])

  const todosConfirmablesSeleccionados =
    confirmables.length > 0 && confirmables.every((p) => selectedIds.has(p.contrato_id))

  const handleCalcular = async () => {
    limpiarError()
    setSelectedIds(new Set())
    await calcularPendientes({ incluirProximos, diasProximos: 30 })
  }

  const toggleSeleccion = (contratoId, confirmable) => {
    if (!confirmable) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(contratoId)) next.delete(contratoId)
      else next.add(contratoId)
      return next
    })
  }

  const toggleSeleccionarTodos = () => {
    if (todosConfirmablesSeleccionados) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(confirmables.map((p) => p.contrato_id)))
    }
  }

  const abrirConfirm = (lista) => {
    if (!lista.length) return
    setConfirmTarget(lista)
    setConfirmOpen(true)
  }

  const cerrarConfirm = () => {
    if (confirmando) return
    setConfirmOpen(false)
    setConfirmTarget([])
  }

  const ejecutarConfirm = async () => {
    const { ok, data } = await confirmarSeleccionados(confirmTarget)
    if (!ok) return

    const confirmadosIds = new Set(confirmTarget.map((p) => p.contrato_id))
    setPropuestas((prev) => prev.filter((p) => !confirmadosIds.has(p.contrato_id)))
    setSelectedIds(new Set())
    cerrarConfirm()
  }

  const seleccionados = propuestas.filter((p) => selectedIds.has(p.contrato_id))

  return (
    <>
      <AdminListLayout
        title="Aumentos de alquiler"
        alerts={
          <>
            {error && (
              <Card className="border border-red-200 bg-red-50">
                <p className="text-sm text-red-700">{error}</p>
              </Card>
            )}
            {syncWarning && !error && (
              <Card className="border border-amber-200 bg-amber-50">
                <p className="text-sm text-amber-800">{syncWarning}</p>
              </Card>
            )}
            {resumenSync(syncInfo) && !error && (
              <Card className="border border-emerald-200 bg-emerald-50">
                <p className="text-sm text-emerald-800">Índices sincronizados: {resumenSync(syncInfo)}</p>
              </Card>
            )}
          </>
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Listado de Contratos</h2>
          <div
            className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1"
            role="group"
            aria-label="Filtrar listado de contratos"
          >
            {FILTRO_COLA.map(({ value, label }) => {
              const activo = filtroCola === value
              const count = colaLoading ? '…' : conteosCola[value]
              return (
                <button
                  key={value}
                  type="button"
                  disabled={colaLoading}
                  onClick={() => setFiltroCola(value)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    activo
                      ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  } disabled:opacity-50`}
                >
                  {label} ({count})
                </button>
              )
            })}
          </div>
        </div>

        <AdminTable>
          <AdminTableHead>
            <AdminTableRow>
              <AdminTableHeaderCell>Tipo</AdminTableHeaderCell>
              <AdminTableHeaderCell>Inquilino</AdminTableHeaderCell>
              <AdminTableHeaderCell>Propiedad</AdminTableHeaderCell>
              <AdminTableHeaderCell>Monto actual</AdminTableHeaderCell>
              <AdminTableHeaderCell>Fecha aumento</AdminTableHeaderCell>
              <AdminTableHeaderCell>Periodicidad</AdminTableHeaderCell>
              <AdminTableHeaderCell>Estado</AdminTableHeaderCell>
            </AdminTableRow>
          </AdminTableHead>
          <AdminTableBody>
            {colaLoading ? (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={7}>Cargando…</AdminTableEmptyCell>
              </AdminTableRow>
            ) : contratosListado.length === 0 ? (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={7}>{mensajeListadoVacio}</AdminTableEmptyCell>
              </AdminTableRow>
            ) : (
              contratosListado.map((item) => (
                <AdminTableRow key={item.contrato_id}>
                  <AdminTableCell>
                    <Badge color={item.tipo_ajuste === 'ipc' ? 'violet' : 'slate'} size="xs">
                      {item.tipo_ajuste?.toUpperCase() ?? '—'}
                    </Badge>
                  </AdminTableCell>
                  <AdminTableCell>{item.inquilino_nombre ?? '—'}</AdminTableCell>
                  <AdminTableCell>{item.propiedad_direccion ?? '—'}</AdminTableCell>
                  <AdminTableCell>{formatMonto(item.monto_actual)}</AdminTableCell>
                  <AdminTableCell className="whitespace-nowrap">
                    {formatFecha(item.fecha_proximo_aumento)}
                  </AdminTableCell>
                  <AdminTableCell className="text-sm text-slate-600">
                    {periodicidadLabelPorMeses(item.periodicidad_meses)}
                  </AdminTableCell>
                  <AdminTableCell>
                    <Badge color={item.es_vencido ? 'red' : 'blue'}>{etiquetaCola(item)}</Badge>
                  </AdminTableCell>
                </AdminTableRow>
              ))
            )}
          </AdminTableBody>
        </AdminTable>

        <div className="mt-8 border-t border-slate-200 bg-white">
          <div className="px-4 pb-5 pt-8">
            <h2 className="text-sm font-semibold text-slate-900">Cálculo de aumentos</h2>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
            <Button
            loading={calculando}
            disabled={calculando || confirmando || colaLoading || (cola?.total ?? 0) === 0}
            onClick={handleCalcular}
            className="!border-indigo-500 !bg-indigo-600 !text-white hover:!bg-indigo-700"
          >
            Calcular montos
          </Button>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={incluirProximos}
              onChange={(e) => setIncluirProximos(e.target.checked)}
              disabled={calculando || confirmando}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Incluir próximos 30 días (preview)
          </label>

          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={calculando || confirmando || seleccionados.length === 0}
              onClick={() => abrirConfirm(seleccionados)}
            >
              Confirmar seleccionados ({seleccionados.length})
            </Button>
            <Button
              disabled={calculando || confirmando || confirmables.length === 0}
              onClick={() => abrirConfirm(confirmables)}
              className="!border-indigo-500 !bg-indigo-600 !text-white hover:!bg-indigo-700"
            >
              Confirmar todos vencidos ({confirmables.length})
            </Button>
          </div>
          </div>

          {meta && (
            <p className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
              {meta.total} contrato(s) con montos calculados — al {formatFecha(meta.fecha_calculo)}
            </p>
          )}

          <AdminTable>
          <AdminTableHead>
            <AdminTableRow>
              <AdminTableHeaderCell className="w-10">
                <input
                  type="checkbox"
                  aria-label="Seleccionar todos los confirmables"
                  checked={todosConfirmablesSeleccionados}
                  onChange={toggleSeleccionarTodos}
                  disabled={confirmables.length === 0 || calculando || confirmando}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </AdminTableHeaderCell>
              <AdminTableHeaderCell>Tipo</AdminTableHeaderCell>
              <AdminTableHeaderCell>Inquilino</AdminTableHeaderCell>
              <AdminTableHeaderCell>Propiedad</AdminTableHeaderCell>
              <AdminTableHeaderCell>Monto actual</AdminTableHeaderCell>
              <AdminTableHeaderCell>Monto propuesto</AdminTableHeaderCell>
              <AdminTableHeaderCell>Variación</AdminTableHeaderCell>
              <AdminTableHeaderCell>Período</AdminTableHeaderCell>
              <AdminTableHeaderCell>Índice</AdminTableHeaderCell>
              <AdminTableHeaderCell>Estado</AdminTableHeaderCell>
            </AdminTableRow>
          </AdminTableHead>
          <AdminTableBody>
            {propuestas.length === 0 ? (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={10}>
                  {calculando
                    ? 'Calculando montos…'
                    : 'Apretá «Calcular montos» para ver índices y montos propuestos'}
                </AdminTableEmptyCell>
              </AdminTableRow>
            ) : (
              propuestas.map((p) => {
                const badge = estadoBadge[p.estado] ?? { color: 'slate', label: p.estado }
                return (
                  <AdminTableRow key={p.contrato_id}>
                    <AdminTableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(p.contrato_id)}
                        onChange={() => toggleSeleccion(p.contrato_id, p.confirmable)}
                        disabled={!p.confirmable || calculando || confirmando}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-40"
                      />
                    </AdminTableCell>
                    <AdminTableCell>
                      <Badge color={p.indice_tipo === 'ipc' ? 'violet' : 'slate'} size="xs">
                        {p.tipo_ajuste?.toUpperCase() ?? p.indice_tipo?.toUpperCase() ?? '—'}
                      </Badge>
                    </AdminTableCell>
                    <AdminTableCell>{p.inquilino_nombre ?? '—'}</AdminTableCell>
                    <AdminTableCell>{p.propiedad_direccion ?? '—'}</AdminTableCell>
                    <AdminTableCell>{formatMonto(p.monto_actual)}</AdminTableCell>
                    <AdminTableCell className="font-medium text-slate-900">
                      {formatMonto(p.monto_propuesto)}
                    </AdminTableCell>
                    <AdminTableCell>
                      {p.variacion_pct != null ? `${p.variacion_pct}%` : '—'}
                    </AdminTableCell>
                    <AdminTableCell className="whitespace-nowrap text-sm">
                      {formatFecha(p.fecha_desde)} → {formatFecha(p.fecha_hasta)}
                      {!p.es_vencido && (
                        <Badge color="blue" size="xs" className="ml-1">
                          Próximo
                        </Badge>
                      )}
                    </AdminTableCell>
                    <AdminTableCell className="text-sm">{detalleIndice(p)}</AdminTableCell>
                    <AdminTableCell>
                      <Badge color={badge.color}>{badge.label}</Badge>
                    </AdminTableCell>
                  </AdminTableRow>
                )
              })
            )}
          </AdminTableBody>
          </AdminTable>
        </div>
      </AdminListLayout>

      <AdminConfirmModal
        open={confirmOpen}
        title="Confirmar aumentos"
        message={`¿Confirmar ${confirmTarget.length} aumento(s)? Se actualizará el monto del contrato y quedará registro en el historial.`}
        confirmLabel="Confirmar"
        confirmVariant="primary"
        loading={confirmando}
        onCancel={cerrarConfirm}
        onConfirm={ejecutarConfirm}
      />
    </>
  )
}
