import { useEffect, useState } from 'react'
import { listarHistorialAumentos } from '../../services/aumentosService'
import { badgeIndicador, formatFechaAumento, puedeDeshacerAumento } from '../../utils/aumentosUi'
import { IconArrowRight, IconCheckCircle, IconClock, IconDocument, IconUndo } from '../icons/Icons'
import Modal, { ModalBody, ModalFooter, ModalHeader } from '../ui/Modal'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import { calloutClass, surfaceCard } from '../../utils/ui'

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

function formatFechaHora(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function EstadoTag({ aplicado }) {
  if (aplicado) {
    return (
      <Badge tone="success" icon={IconCheckCircle}>
        Confirmado
      </Badge>
    )
  }
  return <Badge tone="brand">Pendiente de aplicar</Badge>
}

function VariacionAprox({ item }) {
  const aprox = Boolean(item?.detalle_calculo?.es_aproximado)
  if (!aprox) return null
  return (
    <span className="text-xs font-medium text-amber-700" title="El monto se confirmó con índice provisorio">
      aprox.
    </span>
  )
}

function FilaHistorial({ item, posicion, onVerComprobante, onDeshacer, disabled }) {
  const indicador = badgeIndicador(item.indice_tipo)
  const pct = formatPct(item.porcentaje_aplicado)

  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      <div className="flex flex-col items-center">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold tabular-nums text-slate-600 ring-1 ring-slate-200">
          {posicion}
        </span>
        <span className="mt-1 w-px flex-1 bg-slate-200 last:hidden" aria-hidden />
      </div>

      <div className={`${surfaceCard} min-w-0 flex-1 px-4 py-3`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">
              Rige desde el {formatFechaAumento(item.fecha_aplicacion)}
            </span>
            {item.indice_tipo && (
              <span className={indicador.className}>{indicador.label}</span>
            )}
          </div>
          <EstadoTag aplicado={item.aplicado} />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="tabular-nums text-slate-500 line-through">
            {formatMonto(item.monto_anterior)}
          </span>
          <IconArrowRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="tabular-nums font-semibold text-slate-900">
            {formatMonto(item.monto_nuevo)}
          </span>
          {pct && (
            <span className="tabular-nums text-xs font-medium text-emerald-600">(+{pct})</span>
          )}
          <VariacionAprox item={item} />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
          <span>{MODO_LABEL[item.modo] ?? item.modo}</span>
          <span>·</span>
          <span>Registrado el {formatFechaHora(item.fecha_creacion)}</span>
        </div>

        {item.notas && (
          <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{item.notas}</p>
        )}

        {(onVerComprobante || onDeshacer) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2.5">
            {onVerComprobante && (
              <Button
                variant="secondary"
                size="sm"
                icon={IconDocument}
                onClick={() => onVerComprobante(item)}
                disabled={disabled}
              >
                Ver comprobante
              </Button>
            )}
            {onDeshacer && puedeDeshacerAumento(item) && (
              <Button
                variant="dangerOutline"
                size="sm"
                icon={IconUndo}
                onClick={() => onDeshacer(item)}
                disabled={disabled}
              >
                Deshacer
              </Button>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

export default function AumentoHistorialModal({
  open,
  propuesta,
  onClose,
  onVerComprobante,
  onDeshacer,
  accionDeshabilitada = false,
  reloadToken = 0,
}) {
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  const contratoId = propuesta?.contrato_id ?? null

  useEffect(() => {
    if (!open || contratoId == null) return

    let activo = true
    setCargando(true)
    setError(null)

    listarHistorialAumentos(contratoId).then(({ data, error: err }) => {
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
  }, [open, contratoId, reloadToken])

  if (!open || !propuesta) return null

  return (
    <Modal open={open} onClose={onClose} size="2xl" layer="stacked" labelledBy="aumento-historial-titulo">
      <ModalHeader
        titleId="aumento-historial-titulo"
        icon={IconClock}
        title="Historial de aumentos"
        subtitle={`${propuesta.inquilino_nombre ?? '—'}${propuesta.propiedad_direccion ? ` · ${propuesta.propiedad_direccion}` : ''}`}
        onClose={onClose}
      />

      <ModalBody>
        {cargando ? (
          <p className="py-8 text-center text-sm text-slate-500">Cargando historial…</p>
        ) : error ? (
          <div className={calloutClass('danger')}>{error}</div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center">
            <p className="text-sm font-medium text-slate-700">Sin aumentos registrados todavía</p>
            <p className="mt-1 text-sm text-slate-500">
              Cuando confirmes el primer aumento de este contrato, va a aparecer acá.
            </p>
          </div>
        ) : (
          <ol className="relative">
            {items.map((item, idx) => (
              <FilaHistorial
                key={item.id}
                item={item}
                posicion={items.length - idx}
                onVerComprobante={onVerComprobante}
                onDeshacer={idx === 0 ? onDeshacer : undefined}
                disabled={accionDeshabilitada}
              />
            ))}
          </ol>
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
