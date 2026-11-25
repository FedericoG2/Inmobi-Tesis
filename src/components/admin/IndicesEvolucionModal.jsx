import { useState } from 'react'
import { useConsulta } from '../../hooks/useConsulta'
import IpcBarChart from './IpcBarChart'
import { obtenerIpcAnualArgly, obtenerSeriesArgly } from '../../services/arglyService'
import { hoyIsoLocal } from '../../utils/aumentosUi'
import { IconChart } from '../icons/Icons'
import Modal, { ModalBody, ModalFooter, ModalHeader } from '../ui/Modal'
import Button from '../ui/Button'
import { calloutClass, cn, segmentedInlineClass, segmentedItemClass } from '../../utils/ui'

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function iclMensualDelAnio(serie, anio) {
  const porMes = new Map()
  for (const punto of serie ?? []) {
    if (!punto.fecha?.startsWith(String(anio))) continue
    const mes = Number(punto.fecha.slice(5, 7))
    if (!Number.isFinite(mes)) continue
    porMes.set(mes, punto.valor)
  }
  return [...porMes.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([mes, valor]) => ({
      mes: MESES_CORTOS[mes - 1] ?? String(mes),
      valor,
    }))
}

export default function IndicesEvolucionModal({ open, onClose }) {
  const [tab, setTab] = useState('ipc')
  const anio = new Date().getFullYear()

  const consulta = useConsulta(open ? anio : null, async () => {
    const [ipcResult, iclResult] = await Promise.all([
      obtenerIpcAnualArgly(anio),
      obtenerSeriesArgly({ ipc: null, icl: { desde: `${anio}-01-01`, hasta: hoyIsoLocal() } }),
    ])
    const ipc = ipcResult.error ? [] : (ipcResult.data?.ipcAnual ?? [])
    const icl = iclResult.error ? [] : iclMensualDelAnio(iclResult.data?.icl, anio)
    if (ipc.length === 0 && icl.length === 0) {
      return { error: { message: ipcResult.error?.message ?? iclResult.error?.message ?? 'No se pudieron cargar los índices.' } }
    }
    return { data: { ipc, icl } }
  })
  const ipcAnual = consulta.data?.ipc ?? []
  const iclAnual = consulta.data?.icl ?? []
  const cargando = consulta.cargando
  const error = consulta.error?.message ?? null

  if (!open) return null

  const esIpc = tab === 'ipc'
  const serie = esIpc ? ipcAnual : iclAnual
  const ultimoMes = serie.at(-1)?.mes

  return (
    <Modal open={open} onClose={onClose} size="3xl" labelledBy="indices-evolucion-titulo">
      <ModalHeader
        titleId="indices-evolucion-titulo"
        icon={IconChart}
        title="Evolución de índices"
        subtitle={`${esIpc ? `Variación mensual IPC ${anio}` : `ICL mensual ${anio}`}${ultimoMes ? ` · hasta ${ultimoMes}` : ''} · Fuente Argly`}
        onClose={onClose}
      />

      <ModalBody>
        <div className={segmentedInlineClass} role="tablist" aria-label="Índice a visualizar">
          {[
            { value: 'ipc', label: 'IPC' },
            { value: 'icl', label: 'ICL' },
          ].map(({ value, label }) => {
            const activo = tab === value
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={activo}
                onClick={() => setTab(value)}
                className={cn(segmentedItemClass(activo, { fill: false }), 'min-w-16')}
              >
                {label}
              </button>
            )
          })}
        </div>

        <div className="mt-5 min-h-[18rem]">
          {cargando ? (
            <p className="py-16 text-center text-sm text-slate-500">Cargando índices…</p>
          ) : error && serie.length === 0 ? (
            <div className={calloutClass('danger')}>{error}</div>
          ) : serie.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-500">
              Sin datos de {esIpc ? 'IPC' : 'ICL'} para {anio}.
            </p>
          ) : (
            <IpcBarChart data={serie} height={280} unidad={esIpc ? '%' : ''} />
          )}
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      </ModalFooter>
    </Modal>
  )
}
