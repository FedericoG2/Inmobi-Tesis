// Usuarios y datos de prueba compartidos por las pruebas de la base (tests/db).
import { comoUsuario, crearBase, fijarHoy } from './cargarBase.js'

export const ENCARGADO = '00000000-0000-0000-0000-0000000000e1'
export const ADMIN = '00000000-0000-0000-0000-0000000000a1'
export const INQUILINO = '00000000-0000-0000-0000-0000000000c1'
export const PROPIETARIO = '00000000-0000-0000-0000-0000000000b1'

/** Fecha de "hoy" de las pruebas: abril, con la bandeja de aumentos abierta (día 12). */
export const HOY = '2026-04-12'

/**
 * Base nueva con una cuenta de cada rol y las funciones para armar escenarios sobre ella.
 * Cada escenario crea su propio propietario, propiedad e inquilino: las pruebas no se pisan.
 */
export async function prepararBase() {
  const db = await crearBase()
  await db.exec(`
    INSERT INTO auth.users (id, email, raw_app_meta_data) VALUES
      ('${ENCARGADO}', 'encargado@prueba.com', '{"rol":"encargado"}'),
      ('${ADMIN}', 'admin@prueba.com', '{"rol":"admin"}'),
      ('${INQUILINO}', 'inquilino@prueba.com', '{"rol":"inquilino"}'),
      ('${PROPIETARIO}', 'propietario@prueba.com', '{"rol":"propietario"}');
  `)
  await fijarHoy(db, HOY)

  let secuencia = 0
  const filas = async (sql, params) => (await db.query(sql, params)).rows
  const una = async (sql, params) => (await filas(sql, params))[0]

  async function escenario({ perfilInquilino = null, perfilPropietario = null } = {}) {
    secuencia += 1
    // Una cuenta de portal se vincula a una sola ficha: se libera de escenarios anteriores.
    if (perfilInquilino) await db.query('UPDATE inquilinos SET perfil_id = NULL WHERE perfil_id = $1', [perfilInquilino])
    if (perfilPropietario) await db.query('UPDATE propietarios SET perfil_id = NULL WHERE perfil_id = $1', [perfilPropietario])
    const propietario = await una(
      `INSERT INTO propietarios (nombre_completo, dni_cuit, perfil_id) VALUES ($1, $2, $3) RETURNING id`,
      [`Propietario ${secuencia}`, `20${String(secuencia).padStart(9, '0')}`, perfilPropietario]
    )
    const propiedad = await una(
      `INSERT INTO propiedades (propietario_id, direccion, tipo, estado) VALUES ($1, $2, 'Casa', 'Disponible') RETURNING id`,
      [propietario.id, `Calle ${secuencia} 100, Córdoba`]
    )
    const inquilino = await una(
      `INSERT INTO inquilinos (nombre_completo, dni_cuit, perfil_id) VALUES ($1, $2, $3) RETURNING id`,
      [`Inquilino ${secuencia}`, `3${String(secuencia).padStart(7, '0')}`, perfilInquilino]
    )
    return { propietario: propietario.id, propiedad: propiedad.id, inquilino: inquilino.id }
  }

  /** Contrato IPC trimestral desde enero, con vencimiento el día 10 (lo carga el Encargado). */
  async function crearContrato(e, datos = {}) {
    const c = {
      fecha_inicio: '2026-01-01',
      fecha_fin: '2027-12-31',
      monto: 100000,
      periodicidad: 3,
      proximo: '2026-04-01',
      dia: 10,
      ...datos,
    }
    return comoUsuario(db, ENCARGADO, async (tx) => {
      const r = await tx.query(
        `INSERT INTO contratos (propiedad_id, inquilino_id, fecha_inicio, fecha_fin, monto_inicial, monto_alquiler,
           periodicidad_meses, tipo_ajuste, fecha_proximo_aumento, dia_vencimiento)
         VALUES ($1, $2, $3, $4, $5, $5, $6, 'ipc', $7, $8) RETURNING id, estado::text`,
        [e.propiedad, e.inquilino, c.fecha_inicio, c.fecha_fin, c.monto, c.periodicidad, c.proximo, c.dia]
      )
      return r.rows[0]
    })
  }

  const estadoPropiedad = async (id) =>
    (await una(`SELECT estado::text FROM propiedades WHERE id = $1`, [id])).estado

  async function confirmar(contratoId, monto = 108000, uid = ENCARGADO) {
    return comoUsuario(db, uid, async (tx) => {
      const r = await tx.query(`SELECT confirmar_aumentos($1::jsonb) AS r`, [
        JSON.stringify([{ contrato_id: contratoId, monto_nuevo: monto, modo: 'calculado', indice_tipo: 'ipc' }]),
      ])
      return r.rows[0].r
    })
  }

  async function crearReclamo(e, contratoId, uid = ENCARGADO, extra = {}) {
    return comoUsuario(db, uid, async (tx) => {
      const r = await tx.query(
        `INSERT INTO reclamos (propiedad_id, inquilino_id, contrato_id, titulo, descripcion, categoria, estado)
         VALUES ($1, $2, $3, 'Pérdida de agua', 'Gotea el caño de la cocina', 'Plomería', $4) RETURNING id, estado::text`,
        [e.propiedad, e.inquilino, contratoId, extra.estado ?? 'Pendiente']
      )
      return r.rows[0]
    })
  }

  const gestionar = (reclamoId, estado, comentario = null) =>
    comoUsuario(db, ENCARGADO, (tx) =>
      tx.query(`SELECT * FROM gestionar_reclamo($1, $2::reclamo_estado, $3)`, [reclamoId, estado, comentario])
    )

  return { db, filas, una, escenario, crearContrato, estadoPropiedad, confirmar, crearReclamo, gestionar }
}
