import { useMemo, useState } from 'react'
import { Badge, Button, Card } from '@tremor/react'
import AdminConfirmModal from '../../components/admin/AdminConfirmModal'
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

const formatFechaCorta = (fecha) => {
  if (!fecha) return '—'
  const [year, month, day] = fecha.split('-')
  return `${day}/${month}/${year.slice(2)}`
}

function observacionesPropuesta(propuesta) {
  if (propuesta.es_aproximado) {
    const detalle =
      propuesta.ipc_meses != null && propuesta.ipc_meses_esperados != null
        ? `: ${propuesta.ipc_meses}/${propuesta.ipc_meses_esperados} meses IPC publicados`
        : ': faltan variaciones IPC del período'
    return (
      <span className="text-xs leading-snug text-slate-600">
        <span className="font-medium underline decoration-red-500 underline-offset-2 text-red-600">
          Aproximado
        </span>
        {detalle}
      </span>
    )
  }
  if (propuesta.estado === 'falta_indice') {
    return (
      <span className="text-xs leading-snug text-slate-600">
        <span className="font-medium underline decoration-red-500 underline-offset-2 text-red-600">
          Falta índice
        </span>
        : no hay datos suficientes para calcular
      </span>
    )
  }
  if (propuesta.estado === 'ok') {
    if (propuesta.confirmable) {
      const detalle =
        propuesta.indice_tipo === 'ipc' &&
        propuesta.ipc_meses != null &&
        propuesta.ipc_meses_esperados != null
          ? `: ${propuesta.ipc_meses}/${propuesta.ipc_meses_esperados} meses IPC`
          : ': índice del período disponible'
      return (
        <span className="text-xs leading-snug text-slate-600">
          <span className="font-medium underline decoration-emerald-600 underline-offset-2 text-emerald-700">
            Definitivo
          </span>
          {detalle}
        </span>
      )
    }
    return (
      <span className="text-xs leading-snug text-slate-600">
        <span className="font-medium underline decoration-slate-500 underline-offset-2 text-slate-700">
          Estimación
        </span>
        : índices disponibles; confirmar al vencer la fecha
      </span>
    )
  }
  return <span className="text-sm text-slate-400">—</span>
}

function detalleIndice(propuesta) {
  if (propuesta.indice_tipo === 'ipc') {
    if (propuesta.ipc_meses != null && propuesta.ipc_meses_esperados != null) {
      const base = `${propuesta.ipc_meses}/${propuesta.ipc_meses_esperados} meses IPC`
      return propuesta.es_aproximado ? `${base} (aprox.)` : base
    }
    if (propuesta.ipc_meses != null) {
      return `${propuesta.ipc_meses} meses IPC`
    }
    return 'IPC'
  }
  if (propuesta.indice_valor_inicio != null && propuesta.indice_valor_fin != null) {
    return `ICL ${propuesta.indice_valor_inicio} → ${propuesta.indice_valor_fin}`
  }
  return null
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

function IconoAdvertencia({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
      />
    </svg>
  )
}

function LeyendaIndicesModal({ open, onClose }) {
  return (
    <AdminAlertModal open={open} title="Cálculo de índices" onClose={onClose} compact>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-slate-600">
        <p>
          <span className="font-semibold text-slate-900">ICL</span>
          <br />
          Si no hay índice para la fecha exacta, se usa el último valor publicado anterior. Los
          aumentos próximos a vencer son{' '}
          <span className="font-semibold text-red-600 underline decoration-red-500 underline-offset-2">
            estimaciones
          </span>{' '}
          que pueden variar al confirmarse.
        </p>
        <p>
          <span className="font-semibold text-slate-900">IPC</span>
          <br />
          Si faltan meses al final del período (aún no publicados), se muestra un monto{' '}
          <span className="font-semibold text-red-600 underline decoration-red-500 underline-offset-2">
            aproximado
          </span>{' '}
          con los meses disponibles; la confirmación requiere el período completo.
        </p>
      </div>
    </AdminAlertModal>
  )
}

export default function AdminAumentos() {
  const [filtroCola, setFiltroCola] = useState('todos')
  const [seleccionCola, setSeleccionCola] = useState(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState([])
  const [leyendaOpen, setLeyendaOpen] = useState(false)

  const {
    cola,
    colaLoading,
    propuestas,
    meta,
    syncWarning,
    calculando,
    confirmando,
    error,
    calcularPendientes,
    confirmarSeleccionados,
    limpiarError,
    setPropuestas,
  } = useAumentos()

  const tituloConfirmar = (propuesta) => {
    if (propuesta.confirmable) return 'Confirmar aumento'
    if (propuesta.estado === 'falta_indice') return 'No se puede confirmar: falta índice'
    if (propuesta.es_aproximado) {
      return 'Aproximado: confirme cuando se publiquen todos los meses IPC del período'
    }
    return 'Solo se confirman aumentos vencidos con índice completo'
  }

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

  const totalCola = cola?.items?.length ?? 0

  const esSeleccionParcial =
    seleccionCola.size > 0 && seleccionCola.size < totalCola

  const todosColaSeleccionados =
    contratosListado.length > 0 &&
    contratosListado.every((i) => seleccionCola.has(i.contrato_id))

  const toggleSeleccionCola = (contratoId) => {
    setSeleccionCola((prev) => {
      const next = new Set(prev)
      if (next.has(contratoId)) next.delete(contratoId)
      else next.add(contratoId)
      return next
    })
  }

  const toggleSeleccionarTodaCola = () => {
    if (todosColaSeleccionados) {
      setSeleccionCola(new Set())
    } else {
      setSeleccionCola(new Set(contratosListado.map((i) => i.contrato_id)))
    }
  }

  const handleCalcular = async () => {
    limpiarError()
    const contratoIds = esSeleccionParcial ? [...seleccionCola] : null
    await calcularPendientes({ incluirProximos: true, diasProximos: 30, contratoIds })
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
    setSeleccionCola((prev) => {
      const next = new Set(prev)
      confirmadosIds.forEach((id) => next.delete(id))
      return next
    })
    cerrarConfirm()
  }

  const mensajeConfirm =
    confirmTarget.length === 1
      ? `¿Confirmar el aumento de ${confirmTarget[0].inquilino_nombre ?? 'este contrato'}? Se actualizará el monto del contrato y quedará registro en el historial.`
      : `¿Confirmar ${confirmTarget.length} aumento(s)? Se actualizará el monto del contrato y quedará registro en el historial.`

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
              <AdminTableHeaderCell className="w-10">
                <input
                  type="checkbox"
                  aria-label="Seleccionar todos los contratos visibles"
                  checked={todosColaSeleccionados}
                  onChange={toggleSeleccionarTodaCola}
                  disabled={colaLoading || contratosListado.length === 0 || calculando || confirmando}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </AdminTableHeaderCell>
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
                <AdminTableEmptyCell colSpan={8}>Cargando…</AdminTableEmptyCell>
              </AdminTableRow>
            ) : contratosListado.length === 0 ? (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={8}>{mensajeListadoVacio}</AdminTableEmptyCell>
              </AdminTableRow>
            ) : (
              contratosListado.map((item) => (
                <AdminTableRow key={item.contrato_id}>
                  <AdminTableCell>
                    <input
                      type="checkbox"
                      aria-label={`Seleccionar contrato de ${item.inquilino_nombre ?? 'inquilino'}`}
                      checked={seleccionCola.has(item.contrato_id)}
                      onChange={() => toggleSeleccionCola(item.contrato_id)}
                      disabled={calculando || confirmando}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </AdminTableCell>
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
                    <span
                      className={`inline-flex items-center whitespace-nowrap rounded border border-slate-300 bg-transparent px-2 py-0.5 text-xs font-medium ${
                        item.es_vencido ? 'text-red-700' : 'text-slate-700'
                      }`}
                    >
                      {etiquetaCola(item)}
                    </span>
                  </AdminTableCell>
                </AdminTableRow>
              ))
            )}
          </AdminTableBody>
        </AdminTable>

        <div className="mt-8 border-t border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-3 pt-8">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-slate-900">Cálculo de aumentos</h2>
              <button
                type="button"
                onClick={() => setLeyendaOpen(true)}
                title="Cómo se calculan ICL e IPC"
                aria-label="Ver advertencia sobre cálculo de índices"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-amber-600 transition-colors hover:bg-amber-50"
              >
                <IconoAdvertencia className="h-4 w-4" />
              </button>
            </div>
            {meta && (
              <span className="text-xs text-slate-500">
                {meta.total} contrato(s) calculado(s) al {formatFecha(meta.fecha_calculo)}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
            <Button
            loading={calculando}
            disabled={calculando || confirmando || colaLoading || (cola?.total ?? 0) === 0}
            onClick={handleCalcular}
            className="!border-indigo-500 !bg-indigo-600 !text-white hover:!bg-indigo-700"
          >
            {esSeleccionParcial
              ? `Calcular seleccionados (${seleccionCola.size})`
              : 'Calcular montos'}
          </Button>

          <p className="text-sm text-slate-500">
            {esSeleccionParcial
              ? 'Calcula solo los contratos seleccionados en el listado'
              : 'Calcula todos: los vencidos y estima los de los próximos 30 días'}
          </p>
          </div>

          <AdminTable>
          <AdminTableHead>
            <AdminTableRow>
              <AdminTableHeaderCell className="w-[22%]">Inquilino</AdminTableHeaderCell>
              <AdminTableHeaderCell className="w-[8%] !text-center">Tipo</AdminTableHeaderCell>
              <AdminTableHeaderCell className="w-[16%] !text-right">Monto actual</AdminTableHeaderCell>
              <AdminTableHeaderCell className="w-[14%] !text-right">Monto propuesto</AdminTableHeaderCell>
              <AdminTableHeaderCell className="w-[18%]">Período</AdminTableHeaderCell>
              <AdminTableHeaderCell className="w-[18%]">Observaciones</AdminTableHeaderCell>
              <AdminTableActionsHeaderCell className="w-[12%]">Acciones</AdminTableActionsHeaderCell>
            </AdminTableRow>
          </AdminTableHead>
          <AdminTableBody>
            {propuestas.length === 0 ? (
              <AdminTableRow>
                <AdminTableEmptyCell colSpan={7}>
                  {calculando
                    ? 'Calculando montos…'
                    : 'Apretá «Calcular montos» para ver índices y montos propuestos'}
                </AdminTableEmptyCell>
              </AdminTableRow>
            ) : (
              propuestas.map((p) => {
                const indiceDetalle = detalleIndice(p)
                const periodoTitle = indiceDetalle
                  ? `${formatFecha(p.fecha_desde)} → ${formatFecha(p.fecha_hasta)} · ${indiceDetalle}`
                  : `${formatFecha(p.fecha_desde)} → ${formatFecha(p.fecha_hasta)}`

                return (
                  <AdminTableRow key={p.contrato_id}>
                    <AdminTableCell className="truncate" title={p.inquilino_nombre ?? undefined}>
                      {p.inquilino_nombre ?? '—'}
                    </AdminTableCell>
                    <AdminTableCell className="!text-center">
                      <Badge color={p.indice_tipo === 'ipc' ? 'violet' : 'slate'} size="xs">
                        {p.tipo_ajuste?.toUpperCase() ?? p.indice_tipo?.toUpperCase() ?? '—'}
                      </Badge>
                    </AdminTableCell>
                    <AdminTableCell className="!text-right whitespace-nowrap">
                      {formatMonto(p.monto_actual)}
                    </AdminTableCell>
                    <AdminTableCell className="!text-right whitespace-nowrap">
                      {p.estado === 'falta_indice' ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <span className="font-medium text-slate-900">
                          {formatMonto(p.monto_propuesto)}
                          {p.variacion_pct != null && (
                            <span className="ml-1 text-xs font-normal text-slate-500">
                              ({p.variacion_pct}%)
                            </span>
                          )}
                        </span>
                      )}
                    </AdminTableCell>
                    <AdminTableCell className="text-sm whitespace-nowrap" title={periodoTitle}>
                      {formatFechaCorta(p.fecha_desde)} → {formatFechaCorta(p.fecha_hasta)}
                    </AdminTableCell>
                    <AdminTableCell>{observacionesPropuesta(p)}</AdminTableCell>
                    <AdminTableActionsCell>
                      <button
                        type="button"
                        disabled={!p.confirmable || calculando || confirmando}
                        title={tituloConfirmar(p)}
                        onClick={() => abrirConfirm([p])}
                        className="whitespace-nowrap rounded-md border border-indigo-500 bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400 disabled:hover:bg-slate-100"
                      >
                        Confirmar
                      </button>
                    </AdminTableActionsCell>
                  </AdminTableRow>
                )
              })
            )}
          </AdminTableBody>
          </AdminTable>
        </div>
      </AdminListLayout>

      <LeyendaIndicesModal open={leyendaOpen} onClose={() => setLeyendaOpen(false)} />

      <AdminConfirmModal
        open={confirmOpen}
        title="Confirmar aumentos"
        message={mensajeConfirm}
        confirmLabel="Confirmar"
        confirmVariant="primary"
        loading={confirmando}
        onCancel={cerrarConfirm}
        onConfirm={ejecutarConfirm}
      />
    </>
  )
}
