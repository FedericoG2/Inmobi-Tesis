import { documentosInquilino } from '../../data/mockData'

export default function InquilinoDocumentos() {
  const handleDownload = (nombre) => {
    alert(`Descarga simulada: ${nombre}`)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800">Mis Documentos</h2>

      <ul className="space-y-3">
        {documentosInquilino.map((doc) => (
          <li
            key={doc.id}
            className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-xs font-bold text-red-600">
                {doc.tipo}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{doc.nombre}</p>
                <p className="text-xs text-slate-400">{doc.fecha}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleDownload(doc.nombre)}
              className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100"
            >
              Descargar
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
