import { useEffect, useMemo, useState } from 'react'
import { listarHistorialGlobalAumentos } from '../../services/aumentosService'
import {
  capitalizar,
  puedeDeshacerAumento,
  claveMes,
  formatPeriodoMesAnio,
  MESES_LARGOS,
} from '../../utils/aumentosUi'
import { IconCheckCircle, IconClock, IconDocument, IconUndo } from '../icons/Icons'
import Modal, { ModalBody, ModalFooter, ModalHeader } from '../ui/Modal'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import IconButton from '../ui/IconButton'
import FilterSelect from './FilterSelect'
import IndiceChip from './IndiceChip'
import { calloutClass } from '../../utils/ui'

const formatMonto = (monto) => {
  if (monto == null) return '—'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(monto))
}

const formatPct = (valor) => {
  if (valor == null) return null
  return `${Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`
}

const MODO_LABEL = {
  calculado: 'Calculado',
  manual: 'Manual',
  porcentaje_fijo: 'Porcentaje fijo',
}

function etiquetaPeriodo(clave) {
  const [anio, mes] = clave.split('-').map(Number)
  return `${capitalizar(MESES_LARGOS[mes - 1] ?? String(mes))} ${anio}`
}

function EstadoTag({ deshacible }) {
  return deshacible ? (
    <Badge tone="brand">Se puede deshacer</Badge>
  ) : (
    <Badge tone="success" icon={IconCheckCircle}>
      Fijo
    </Badge>
  )
}

export default function AumentosHistorialGlobalModal({
  open,
  onClose,
  onVerComprobante,
  onDeshacer,
  accionDeshabilitada = false,
  reloadToken = 0,
}) {
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [periodo, setPeriodo] = useState('todos')
  const [indice, setIndice] = useState('todos')
  const [estado, setEstado] = useState('todos')

  useEffect(() => {
    if (!open) return

    let activo = true
    setCargando(true)
    setError(null)

    listarHistorialGlobalAumentos().then(({ data, error: err }) => {
      if (!activo) return
      if (err) {
        setError(err.message)
        setItems([])
      } else {
        setItems(data ?? [])
      }
      setCargando(false)
    })

    return () => {
      activo = false
    }
  }, [open, reloadToken])

  const periodosDisponibles = useMemo(() => {
    const claves = new Set(items.map((i) => claveMes(i.fecha_aplicacion)).filter(Boolean))
    return Array.from(claves).sort((a, b) => b.localeCompare(a))
  }, [items])

  // Solo el aumento más reciente de cada contrato se puede deshacer.
  const deshaciblesIds = useMemo(() => {
    const ultimoPorContrato = new Map()
    for (const i of items) {
      const actual = ultimoPorContrato.get(i.contrato_id)
      if (!actual || i.fecha_aplicacion > actual.fecha_aplicacion) ultimoPorContrato.set(i.contrato_id, i)
    }
    return new Set(
      [...ultimoPorContrato.values()].filter((i) => puedeDeshacerAumento(i)).map((i) => i.id)
    )
  }, [items])

  const itemsFiltrados = useMemo(() => {
    return items.filter((i) => {
      if (periodo !== 'todos' && claveMes(i.fecha_aplicacion) !== periodo) return false
      if (indice !== 'todos' && (i.indice_tipo ?? '').toLowerCase() !== indice) return false
      if (estado === 'deshacible' && !deshaciblesIds.has(i.id)) return false
      if (estado === 'fijo' && deshaciblesIds.has(i.id)) return false
      return true
    })
  }, [items, periodo, indice, estado, deshaciblesIds])

  if (!open) return null

  return (
    <Modal open={open} onClose={onClose} size="5xl" labelledBy="aumentos-historial-global-titulo">
      <ModalHeader
        titleId="aumentos-historial-global-titulo"
        icon={IconClock}
        title="Historial de aumentos"
        subtitle="Todos los aumentos registrados, filtrables por período."
        onClose={onClose}
      />

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-6 py-3">
        <FilterSelect
          id="historial-periodo"
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          onClear={() => setPeriodo('todos')}
          clearValue="todos"
          ariaLabel="Filtrar por período"
        >
          <option value="todos">Período: Todos</option>
          {periodosDisponibles.map((clave) => (
            <option key={clave} value={clave}>
              {etiquetaPeriodo(clave)}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          id="historial-indice"
          value={indice}
          onChange={(e) => setIndice(e.target.value)}
          onClear={() => setIndice('todos')}
          clearValue="todos"
          ariaLabel="Filtrar por índice"
          className="sm:w-36"
        >
          <option value="todos">Índice: Todos</option>
          <option value="icl">ICL</option>
          <option value="ipc">IPC</option>
        </FilterSelect>
        <FilterSelect
          id="historial-estado"
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          onClear={() => setEstado('todos')}
          clearValue="todos"
          ariaLabel="Filtrar por estado"
          className="sm:w-40"
        >
          <option value="todos">Estado: Todos</option>
          <option value="deshacible">Se puede deshacer</option>
          <option value="fijo">Fijo</option>
        </FilterSelect>
        <span className="ml-auto text-sm tabular-nums text-slate-500">
          {cargando ? 'Cargando…' : `${itemsFiltrados.length} aumento${itemsFiltrados.length === 1 ? '' : 's'}`}
        </span>
      </div>

      <ModalBody className="p-0">
        {cargando ? (
          <p className="py-10 text-center text-sm text-slate-500">Cargando historial…</p>
        ) : error ? (
          <div className={calloutClass('danger', 'm-6')}>{error}</div>
        ) : itemsFiltrados.length === 0 ? (
          <div className="m-6 rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center">
            <p className="text-sm font-medium text-slate-700">Sin aumentos para los filtros elegidos</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] font-medium uppercase tracking-wider text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="px-4 py-2.5 pl-6 text-left font-medium">Contrato</th>
                <th className="px-4 py-2.5 text-left font-medium">Período</th>
                <th className="px-4 py-2.5 text-right font-medium">Monto</th>
                <th className="px-4 py-2.5 text-center font-medium">Índice</th>
                <th className="px-4 py-2.5 text-center font-medium">Estado</th>
                <th className="px-4 py-2.5 pr-6 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itemsFiltrados.map((item) => {
                const pct = formatPct(item.porcentaje_aplicado)

                return (
                  <tr key={item.id} className="align-top transition-colors hover:bg-slate-50/70">
                    <td className="px-4 py-3 pl-6">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">{item.inquilino_nombre ?? '—'}</span>
                        <span className="text-xs text-slate-500">{item.propiedad_direccion ?? '—'}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-600">
                      {formatPeriodoMesAnio(item.fecha_aplicacion)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-xs tabular-nums text-slate-400 line-through">
                          {formatMonto(item.monto_anterior)}
                        </span>
                        <span className="font-semibold tabular-nums text-slate-900">{formatMonto(item.monto_nuevo)}</span>
                        {pct && <span className="text-xs font-medium tabular-nums text-emerald-600">+{pct}</span>}
                        <span className="text-xs text-slate-400">{MODO_LABEL[item.modo] ?? item.modo}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <IndiceChip tipo={item.indice_tipo} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <EstadoTag deshacible={deshaciblesIds.has(item.id)} />
                    </td>
                    <td className="px-4 py-3 pr-6">
                      <div className="flex items-center justify-end gap-0.5">
                        {onVerComprobante && (
                          <IconButton
                            label="Ver comprobante"
                            icon={IconDocument}
                            onClick={() => onVerComprobante(item)}
                            disabled={accionDeshabilitada}
                          />
                        )}
                        {onDeshacer && deshaciblesIds.has(item.id) && (
                          <IconButton
                            label="Deshacer aumento"
                            icon={IconUndo}
                            tone="danger"
                            onClick={() => onDeshacer(item)}
                            disabled={accionDeshabilitada}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      </ModalFooter>
    </Modal>
  )
}
