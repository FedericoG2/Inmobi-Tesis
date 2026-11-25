// Los datos de la demo (supabase/seeds) cargan sobre las reglas reales y se pueden volver a cargar.
import { expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { crearBase } from './cargarBase.js'

const SEEDS = join(import.meta.dirname, '..', '..', 'supabase', 'seeds')
const leer = (archivo) => readFileSync(join(SEEDS, archivo), 'utf8')

test('la demo carga dos veces seguidas y deja el escenario del guion', async () => {
  const db = await crearBase()
  await db.exec(
    `INSERT INTO auth.users (id, email) VALUES
       ('00000000-0000-0000-0000-0000000000d1', 'inquilino.demo@inmobi.com'),
       ('00000000-0000-0000-0000-0000000000d2', 'propietario.demo@inmobi.com')`
  )
  await db.exec(leer('demo_00_limpiar.sql'))
  await db.exec(leer('demo_01_presentacion.sql'))
  await db.exec(leer('demo_01_presentacion.sql'))

  const cuenta = async (sql) => (await db.query(sql)).rows[0].n
  const porEstado = async (tabla) =>
    Object.fromEntries((await db.query(`SELECT estado::text AS e, count(*)::int AS n FROM ${tabla} GROUP BY 1`)).rows.map((r) => [r.e, r.n]))

  expect(await cuenta('SELECT count(*)::int AS n FROM propiedades')).toBe(11)
  expect(await porEstado('contratos')).toEqual({ activo: 7, inactivo: 1, programado: 1 })
  expect(await porEstado('reclamos')).toEqual({ Pendiente: 2, 'En Proceso': 2, Revision: 1, Resuelto: 2 })
  expect(await cuenta('SELECT count(*)::int AS n FROM aumentos')).toBe(5)
  expect(await cuenta('SELECT count(*)::int AS n FROM actividad')).toBeGreaterThan(0)
  expect(await cuenta('SELECT count(*)::int AS n FROM inquilinos WHERE perfil_id IS NOT NULL')).toBe(1)
  expect(await cuenta('SELECT count(*)::int AS n FROM propietarios WHERE perfil_id IS NOT NULL')).toBe(1)

  // Alquileres: cada contrato activo tiene el período del mes en curso; dos ya están pagados.
  const mesActual = `date_trunc('month', fecha_hoy_ar())::date`
  const sinPeriodoActual = await cuenta(`
    SELECT count(*)::int AS n FROM contratos c
    WHERE c.estado = 'activo'
      AND NOT EXISTS (SELECT 1 FROM periodos_alquiler p WHERE p.contrato_id = c.id AND p.periodo = ${mesActual})`)
  expect(sinPeriodoActual).toBe(0)
  expect(await cuenta(`SELECT count(*)::int AS n FROM periodos_alquiler WHERE periodo = ${mesActual} AND estado = 'Pagado'`)).toBe(2)
  // El mes en curso de la inquilina del portal queda pendiente para la demo.
  expect(
    await cuenta(`SELECT count(*)::int AS n FROM periodos_alquiler p JOIN contratos c ON c.id = p.contrato_id
      JOIN inquilinos i ON i.id = c.inquilino_id WHERE i.perfil_id IS NOT NULL AND p.periodo = ${mesActual} AND p.estado = 'Pendiente'`)
  ).toBe(1)
  expect(await cuenta(`SELECT count(*)::int AS n FROM periodos_alquiler WHERE estado = 'Pagado'`)).toBeGreaterThan(20)
  // El contrato programado todavía no tiene períodos.
  expect(
    await cuenta(`SELECT count(*)::int AS n FROM periodos_alquiler p JOIN contratos c ON c.id = p.contrato_id WHERE c.estado = 'programado'`)
  ).toBe(0)
}, 60000)
