import { useCallback, useEffect, useRef, useState } from 'react'

const MEDIA_ESCRITORIO = '(min-width: 1024px)'
// Paginación al pie de la tabla y margen inferior de la página.
const RESERVA_PIE = 84

/**
 * Cantidad de filas por página que entran en la pantalla, para que la tabla ocupe el alto disponible
 * sin dejar espacio vacío. Devuelve `[ref, filas]`: `ref` va en el contenedor de la tabla.
 *
 * En escritorio mide dónde empieza el cuerpo de la tabla y el alto de una fila. El alto de la fila
 * se toma una vez (y al cambiar el tamaño de la ventana) para que la cantidad no cambie al pasar de
 * página. En celulares y tablets las filas se muestran como tarjetas y se usa el mínimo.
 */
export function useFilasPorPagina(minimo = 4, maximo = 30) {
  const [nodo, setNodo] = useState(null)
  const [filas, setFilas] = useState(minimo)
  const altoFila = useRef(0)

  const medir = useCallback(() => {
    if (!nodo) return
    if (!window.matchMedia(MEDIA_ESCRITORIO).matches) {
      setFilas(minimo)
      return
    }
    const cuerpo = nodo.querySelector('tbody')
    if (!cuerpo) return
    if (!altoFila.current) {
      const fila = [...cuerpo.querySelectorAll('tr')].find((tr) => !(tr.children.length === 1 && tr.children[0].colSpan > 1))
      if (!fila) return
      altoFila.current = fila.getBoundingClientRect().height
    }
    const inicio = cuerpo.getBoundingClientRect().top + window.scrollY
    const disponibles = Math.floor((window.innerHeight - inicio - RESERVA_PIE) / altoFila.current)
    setFilas(Math.min(maximo, Math.max(minimo, disponibles)))
  }, [nodo, minimo, maximo])

  useEffect(() => {
    if (!nodo) return undefined
    const alRedimensionar = () => {
      altoFila.current = 0
      medir()
    }
    // Lo que está arriba de la tabla (avisos, indicadores, filtros) cambia de alto al cargar datos.
    // El observador también mide apenas empieza a observar.
    const observador = new ResizeObserver(() => medir())
    observador.observe(nodo.parentElement ?? nodo)
    window.addEventListener('resize', alRedimensionar)
    return () => {
      observador.disconnect()
      window.removeEventListener('resize', alRedimensionar)
    }
  }, [nodo, medir])

  return [setNodo, filas]
}
