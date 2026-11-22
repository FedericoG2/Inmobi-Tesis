import { useState } from 'react'

/**
 * Pagina una lista ya filtrada. Cuando cambian los filtros (`claveFiltros`) vuelve a la página 1,
 * y si la lista se achica nunca queda en una página que ya no existe. Se calcula en el render,
 * sin efectos.
 */
export function usePaginacion(items, porPagina, claveFiltros = []) {
  const clave = JSON.stringify(claveFiltros)
  const [estado, setEstado] = useState({ pagina: 1, clave })

  const totalPaginas = Math.max(1, Math.ceil(items.length / porPagina))
  const elegida = estado.clave === clave ? estado.pagina : 1
  const pagina = Math.min(elegida, totalPaginas)
  const inicio = (pagina - 1) * porPagina

  return {
    pagina,
    totalPaginas,
    visibles: items.slice(inicio, inicio + porPagina),
    irAPagina: (nueva) => setEstado({ pagina: nueva, clave }),
  }
}
