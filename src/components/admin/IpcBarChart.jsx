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

const BAR_COLORS = ['#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#6366f1']

function IpcTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  const valor = Number(payload[0].value)

  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-md ring-1 ring-slate-100">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="text-sm font-bold text-brand-700">{valor.toFixed(1)}%</p>
    </div>
  )
}

export default function IpcBarChart({ data, height = 288 }) {
  const maxValor = Math.max(...data.map((d) => d.valor), 0)
  const topeEje = Math.ceil((maxValor + 0.5) * 2) / 2

  return (
    <div className="rounded-xl bg-slate-50/80 px-1 pb-1 pt-2 sm:px-3">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }} barCategoryGap="28%">
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
          <XAxis
            dataKey="mes"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={52}
            domain={[0, topeEje]}
            tick={{ fill: '#64748b', fontSize: 12 }}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<IpcTooltip />} cursor={{ fill: '#eef2ff', opacity: 0.6 }} />
          <Bar dataKey="valor" radius={[8, 8, 0, 0]} maxBarSize={52}>
            {data.map((entry, index) => (
              <Cell
                key={`${entry.mes}-${index}`}
                fill={BAR_COLORS[Math.min(index, BAR_COLORS.length - 1)]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
