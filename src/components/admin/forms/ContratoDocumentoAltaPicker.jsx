import { useRef } from 'react'
import { Button } from '@tremor/react'
import { etiquetaTipoArchivo, validarArchivoContratoLegal } from '../../../services/documentosService'

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

export default function ContratoDocumentoAltaPicker({
  archivo,
  onArchivoChange,
  visibleParaInquilino,
  onVisibleChange,
  error,
  onErrorChange,
  disabled = false,
}) {
  const inputRef = useRef(null)

  const seleccionar = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const validacion = validarArchivoContratoLegal(file)
    if (validacion.error) {
      onErrorChange?.(validacion.error.message)
      return
    }

    onErrorChange?.(null)
    onArchivoChange(file)
  }

  const quitar = () => {
    onArchivoChange(null)
    onErrorChange?.(null)
  }

  return (
    <div className="w-full space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Contrato legal firmado</h3>
        <p className="mt-1 text-sm text-slate-600">
          Adjuntar PDF o Word del contrato de forma opcional.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-700">PDF o Word · máximo 15 MB</p>
            <label className="mt-2 flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={visibleParaInquilino}
                onChange={(e) => onVisibleChange(e.target.checked)}
                disabled={disabled}
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-200"
              />
              Compartir con el inquilino en su portal
            </label>
          </div>

          <div className="shrink-0">
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={seleccionar}
            />
            <Button
              type="button"
              size="xs"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className="!px-4"
            >
              Elegir archivo
            </Button>
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        {archivo ? (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <IconDocument />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{archivo.name}</p>
              <p className="text-xs text-slate-500">{etiquetaTipoArchivo(archivo.name)}</p>
            </div>
            <button
              type="button"
              onClick={quitar}
              disabled={disabled}
              className="text-xs font-medium text-red-600 hover:text-red-800 hover:underline disabled:opacity-50"
            >
              Quitar
            </button>
          </div>
        ) : (
          <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-white px-3 py-3 text-sm text-slate-500">
            Sin archivo seleccionado. Podés continuar y adjuntarlo más tarde.
          </p>
        )}
      </div>
    </div>
  )
}
