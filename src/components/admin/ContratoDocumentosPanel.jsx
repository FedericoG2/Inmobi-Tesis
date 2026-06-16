import { useEffect, useRef, useState } from 'react'
import { Button } from '@tremor/react'
import {
  eliminarDocumentoContrato,
  etiquetaTipoArchivo,
  listarDocumentosContrato,
  obtenerUrlDescargaDocumento,
  subirDocumentoContrato,
  validarArchivoContratoLegal,
  actualizarVisibilidadDocumento,
} from '../../services/documentosService'

function formatFecha(fecha) {
  if (!fecha) return '—'
  const iso = fecha.includes('T') ? fecha.split('T')[0] : fecha
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

function IconDocument({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
      />
    </svg>
  )
}

export default function ContratoDocumentosPanel({
  contratoId,
  propiedadId,
  activo = true,
}) {
  const inputRef = useRef(null)
  const [documentos, setDocumentos] = useState([])
  const [cargando, setCargando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [visibleParaInquilino, setVisibleParaInquilino] = useState(true)
  const [error, setError] = useState(null)
  const [mensaje, setMensaje] = useState(null)

  const recargar = async () => {
    if (!contratoId) return
    setCargando(true)
    setError(null)
    const { data, error: err } = await listarDocumentosContrato(contratoId)
    setCargando(false)
    if (err) {
      setError(err.message ?? 'No se pudieron cargar los documentos')
      setDocumentos([])
      return
    }
    setDocumentos(data ?? [])
  }

  useEffect(() => {
    if (!contratoId) {
      setDocumentos([])
      return
    }
    recargar()
  }, [contratoId])

  const handleSeleccionArchivo = async (event) => {
    const archivo = event.target.files?.[0]
    event.target.value = ''
    if (!archivo || !contratoId || !propiedadId) return

    const validacion = validarArchivoContratoLegal(archivo)
    if (validacion.error) {
      setError(validacion.error.message)
      return
    }

    setSubiendo(true)
    setError(null)
    setMensaje(null)

    const { data, error: err } = await subirDocumentoContrato({
      contratoId,
      propiedadId,
      archivo,
      visibleParaInquilino,
    })

    setSubiendo(false)

    if (err) {
      setError(err.message ?? 'No se pudo subir el archivo')
      return
    }

    setDocumentos((prev) => [data, ...prev])
    setMensaje('Contrato legal adjuntado correctamente.')
  }

  const descargar = async (documento) => {
    setError(null)
    const { data, error: err } = await obtenerUrlDescargaDocumento(documento.url_archivo)
    if (err || !data?.signedUrl) {
      setError(err?.message ?? 'No se pudo generar el enlace de descarga')
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  const quitar = async (documento) => {
    if (!window.confirm(`¿Eliminar "${documento.nombre}"? Esta acción no se puede deshacer.`)) {
      return
    }

    setError(null)
    setMensaje(null)
    const { error: err } = await eliminarDocumentoContrato(documento)
    if (err) {
      setError(err.message ?? 'No se pudo eliminar el documento')
      return
    }
    setDocumentos((prev) => prev.filter((d) => d.id !== documento.id))
    setMensaje('Documento eliminado.')
  }

  const toggleVisibilidad = async (documento) => {
    setError(null)
    const nuevoValor = !documento.visible_para_inquilino
    const { data, error: err } = await actualizarVisibilidadDocumento(documento.id, nuevoValor)
    if (err) {
      setError(err.message ?? 'No se pudo actualizar la visibilidad')
      return
    }
    setDocumentos((prev) => prev.map((d) => (d.id === documento.id ? data : d)))
  }

  return (
    <section>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Contrato legal firmado
        </h3>
        <span className="text-xs text-slate-400">PDF o Word · máx. 15 MB</span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-slate-700">
              Adjuntá el contrato legal firmado. No reemplaza la ficha interna de seguimiento.
            </p>
            <label className="mt-2 flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={visibleParaInquilino}
                onChange={(e) => setVisibleParaInquilino(e.target.checked)}
                disabled={subiendo}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-200"
              />
              Visible para el inquilino en su portal
            </label>
          </div>

          <div className="shrink-0">
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={handleSeleccionArchivo}
            />
            <Button
              type="button"
              size="xs"
              loading={subiendo}
              disabled={!activo || subiendo || !contratoId || !propiedadId}
              onClick={() => inputRef.current?.click()}
              className="!px-4"
            >
              Adjuntar archivo
            </Button>
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        {mensaje && (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{mensaje}</p>
        )}

        <div className="mt-4">
          {cargando ? (
            <p className="text-sm text-slate-500">Cargando documentos...</p>
          ) : documentos.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-3 text-sm text-slate-500">
              Sin contrato legal adjunto por ahora.
            </p>
          ) : (
            <ul className="space-y-2">
              {documentos.map((documento) => (
                <li
                  key={documento.id}
                  className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                      <IconDocument />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{documento.nombre}</p>
                      <p className="text-xs text-slate-500">
                        {etiquetaTipoArchivo(documento.nombre)} · {formatFecha(documento.fecha_subida)}
                        {documento.visible_para_inquilino ? ' · Visible inquilino' : ' · Solo admin'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <label className="flex items-center gap-1.5 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={Boolean(documento.visible_para_inquilino)}
                        onChange={() => toggleVisibilidad(documento)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-200"
                      />
                      Portal inquilino
                    </label>
                    <button
                      type="button"
                      onClick={() => descargar(documento)}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      Descargar
                    </button>
                    <button
                      type="button"
                      onClick={() => quitar(documento)}
                      className="text-xs font-medium text-red-600 hover:text-red-800 hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
