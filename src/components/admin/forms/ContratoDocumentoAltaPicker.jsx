import { useRef } from 'react'
import { etiquetaTipoArchivo, validarArchivoContratoLegal } from '../../../services/documentosService'
import { IconDocument, IconTrash, IconUpload } from '../../icons/Icons'
import Button from '../../ui/Button'
import { calloutClass, iconTileClass, surfaceMuted } from '../../../utils/ui'

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
        <p className="mt-0.5 text-sm text-slate-500">
          Adjuntar PDF o Word del contrato de forma opcional.
        </p>
      </div>

      <div className={`${surfaceMuted} p-4`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-700">PDF o Word · máximo 15 MB</p>
            <label className="mt-2 flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={visibleParaInquilino}
                onChange={(e) => onVisibleChange(e.target.checked)}
                disabled={disabled}
                className="h-4 w-4 rounded border-slate-300"
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
            <Button variant="secondary" icon={IconUpload} disabled={disabled} onClick={() => inputRef.current?.click()}>
              Elegir archivo
            </Button>
          </div>
        </div>

        {error && (
          <p className={calloutClass('danger', 'mt-3')}>{error}</p>
        )}

        {archivo ? (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
            <span className={iconTileClass('brand')}>
              <IconDocument className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{archivo.name}</p>
              <p className="text-xs text-slate-500">{etiquetaTipoArchivo(archivo.name)}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon={IconTrash}
              onClick={quitar}
              disabled={disabled}
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              Quitar
            </Button>
          </div>
        ) : (
          <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-3 text-center text-sm text-slate-500">
            Sin archivo seleccionado. Podés continuar y adjuntarlo más tarde.
          </p>
        )}
      </div>
    </div>
  )
}
