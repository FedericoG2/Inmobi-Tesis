import { useCallback, useEffect, useState } from 'react'

/**
 * Consulta asíncrona atada a una clave (por ejemplo, el id del registro que muestra un modal).
 *
 * - Con clave null no consulta y no devuelve datos.
 * - Cuando cambia la clave vuelve a consultar y descarta las respuestas que lleguen tarde.
 * - `cargando` se deriva comparando la clave del último resultado con la actual: no hace falta
 *   vaciar el estado en un efecto.
 * - `recargar()` vuelve a consultar la misma clave y mantiene los datos a la vista mientras tanto.
 *
 * `consultar` debe devolver `{ data, error }`, como los servicios de src/services.
 */
export function useConsulta(clave, consultar) {
  const [version, setVersion] = useState(0)
  const [resultado, setResultado] = useState({ base: null, clave: null, data: null, error: null })

  const base = clave == null ? null : JSON.stringify(clave)
  const claveActual = base == null ? null : `${base}#${version}`

  useEffect(() => {
    if (claveActual == null) return undefined
    let vigente = true
    Promise.resolve()
      .then(consultar)
      .then(
        (r) => vigente && setResultado({ base, clave: claveActual, data: r?.data ?? null, error: r?.error ?? null }),
        (e) => vigente && setResultado({ base, clave: claveActual, data: null, error: { message: e.message } })
      )
    return () => {
      vigente = false
    }
    // `consultar` cambia en cada render: la consulta se repite solo cuando cambia la clave.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveActual])

  const alDia = claveActual != null && resultado.clave === claveActual
  const mismaBase = base != null && resultado.base === base

  return {
    data: mismaBase ? resultado.data : null,
    error: mismaBase ? resultado.error : null,
    cargando: claveActual != null && !alDia,
    cargandoPrimeraVez: claveActual != null && !mismaBase,
    recargar: useCallback(() => setVersion((v) => v + 1), []),
  }
}
