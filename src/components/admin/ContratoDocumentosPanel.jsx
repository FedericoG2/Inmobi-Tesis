import { useEffect, useRef, useState } from 'react'
import {
  eliminarDocumentoContrato,
  etiquetaTipoArchivo,
  listarDocumentosContrato,
  obtenerUrlDescargaDocumento,
  subirDocumentoContrato,
  validarArchivoContratoLegal,
  actualizarVisibilidadDocumento,
} from '../../services/documentosService'
import { IconDocument, IconDownload, IconTrash, IconUpload } from '../icons/Icons'
import Button from '../ui/Button'
import { calloutClass, eyebrow, iconTileClass, surfaceMuted } from '../../utils/ui'

function formatFecha(fecha) {
  if (!fecha) return '—'
  const iso = fecha.includes('T') ? fecha.split('T')[0] : fecha
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
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
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <h3 className={eyebrow}>Contrato legal firmado</h3>
        <span className="text-xs text-slate-500">PDF o Word · máx. 15 MB</span>
      </div>

      <div className={`${surfaceMuted} p-4`}>
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
                className="h-4 w-4 rounded border-slate-300"
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
              variant="secondary"
              icon={IconUpload}
              loading={subiendo}
              disabled={!activo || subiendo || !contratoId || !propiedadId}
              onClick={() => inputRef.current?.click()}
            >
              Adjuntar archivo
            </Button>
          </div>
        </div>

        {error && (
          <p className={calloutClass('danger', 'mt-3')}>{error}</p>
        )}
        {mensaje && (
          <p className={calloutClass('success', 'mt-3')}>{mensaje}</p>
        )}

        <div className="mt-4">
          {cargando ? (
            <p className="text-sm text-slate-500">Cargando documentos…</p>
          ) : documentos.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-3 text-center text-sm text-slate-500">
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
                    <span className={iconTileClass('brand')}>
                      <IconDocument className="h-5 w-5" />
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
                        className="h-3.5 w-3.5 rounded border-slate-300"
                      />
                      Portal inquilino
                    </label>
                    <Button variant="ghost" size="sm" icon={IconDownload} onClick={() => descargar(documento)}>
                      Descargar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={IconTrash}
                      onClick={() => quitar(documento)}
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      Eliminar
                    </Button>
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
