import { BarChart, Card, Grid, Metric, Title } from '@tremor/react'
import { adminKpis, ocupacionMensual } from '../../data/mockData'

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <Title>Dashboard</Title>
        <p className="mt-1 text-sm text-slate-500">Resumen operativo de la cartera inmobiliaria</p>
      </div>

      <Grid numItemsSm={2} numItemsLg={4} className="gap-4">
        <Card decoration="top" decorationColor="indigo">
          <Metric>Total propiedades</Metric>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{adminKpis.totalPropiedades}</p>
        </Card>
        <Card decoration="top" decorationColor="emerald">
          <Metric>Ocupación</Metric>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{adminKpis.ocupacion}%</p>
        </Card>
        <Card decoration="top" decorationColor="blue">
          <Metric>Contratos activos</Metric>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{adminKpis.contratosActivos}</p>
        </Card>
        <Card decoration="top" decorationColor="amber">
          <Metric>Reclamos pendientes</Metric>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{adminKpis.reclamosPendientes}</p>
        </Card>
      </Grid>

      <Card>
        <Title>Evolución de ocupación</Title>
        <BarChart
          className="mt-6 h-72"
          data={ocupacionMensual}
          index="mes"
          categories={['ocupacion']}
          colors={['indigo']}
          valueFormatter={(v) => `${v}%`}
          yAxisWidth={48}
        />
      </Card>
    </div>
  )
}
