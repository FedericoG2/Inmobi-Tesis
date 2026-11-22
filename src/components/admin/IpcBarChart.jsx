import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { surfacePopover } from '../../utils/ui'

/** Colores de la marca (ver @theme en index.css): barras en brand-200, último dato en brand-600. */
const COLOR_BARRA = '#abb9e9'
const COLOR_BARRA_ACTUAL = '#1c398e'
const COLOR_GRILLA = '#e2e8f0'
const COLOR_EJE = '#64748b'

function formatIndice(valor, unidad) {
  if (unidad === '%') return `${Number(valor).toFixed(1)}%`
  return Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function IpcTooltip({ active, payload, label, unidad }) {
  if (!active || !payload?.length) return null

  const valor = Number(payload[0].value)

  return (
    <div className={`${surfacePopover} px-3 py-2`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-semibold tabular-nums text-slate-900">{formatIndice(valor, unidad)}</p>
    </div>
  )
}

export default function IpcBarChart({ data, height, unidad = '%' }) {
  const maxValor = Math.max(...data.map((d) => d.valor), 0)
  const topeEje = Math.ceil((maxValor + 0.5) * 2) / 2
  const ultimo = data.length - 1

  return (
    <div className={height ? '' : 'h-full min-h-[16rem]'} style={height ? { height } : undefined}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }} barCategoryGap="30%">
          <CartesianGrid stroke={COLOR_GRILLA} vertical={false} />
          <XAxis
            dataKey="mes"
            axisLine={false}
            tickLine={false}
            tick={{ fill: COLOR_EJE, fontSize: 12 }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={unidad === '%' ? 48 : 64}
            domain={[0, topeEje]}
            tick={{ fill: COLOR_EJE, fontSize: 12 }}
            tickFormatter={(v) => formatIndice(v, unidad)}
          />
          <Tooltip content={<IpcTooltip unidad={unidad} />} cursor={{ fill: '#f1f5f9' }} />
          <Bar dataKey="valor" radius={[6, 6, 0, 0]} maxBarSize={44}>
            {data.map((entry, index) => (
              <Cell key={`${entry.mes}-${index}`} fill={index === ultimo ? COLOR_BARRA_ACTUAL : COLOR_BARRA} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
