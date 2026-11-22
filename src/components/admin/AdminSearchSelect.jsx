import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Button from '../ui/Button'
import { IconCheck, IconSearch, IconX } from '../icons/Icons'
import { cn, inputClass, labelClass, surfacePopover } from '../../utils/ui'

const btnLimpiar =
  'absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600'

function normalizar(texto) {
  return (texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/**
 * Campo único de búsqueda con lista desplegable. El valor solo se elige desde las opciones.
 */
export default function AdminSearchSelect({
  id,
  label,
  value,
  onChange,
  options = [],
  emptySelectionLabel = 'Sin selección',
  searchPlaceholder = 'Buscar...',
  noResultsLabel = 'No hay coincidencias',
  disabled = false,
  required = false,
  onVerDetalle,
  verDetalleLabel = 'Ver detalle',
}) {
  const reactId = useId()
  const listboxId = `${id ?? reactId}-listbox`
  const wrapperRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [menuRect, setMenuRect] = useState(null)

  const seleccionado = options.find((o) => String(o.value) === String(value))

  const opcionesFiltradas = useMemo(() => {
    const q = normalizar(query.trim())
    if (!q) return options
    return options.filter((o) => normalizar(o.label).includes(q))
  }, [options, query])

  const valorInput = query !== '' ? query : (seleccionado?.label ?? '')
  const placeholder = seleccionado ? searchPlaceholder : emptySelectionLabel || searchPlaceholder
  const puedeLimpiar = Boolean((query || seleccionado) && !disabled)
  const mostrarBotonDetalle = Boolean(onVerDetalle && seleccionado && !disabled)

  const actualizarPosicionMenu = useCallback(() => {
    const el = wrapperRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setMenuRect({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    })
  }, [])

  useEffect(() => {
    if (!open) return undefined

    actualizarPosicionMenu()

    const onScrollOrResize = () => actualizarPosicionMenu()
    window.addEventListener('resize', onScrollOrResize)
    window.addEventListener('scroll', onScrollOrResize, true)

    return () => {
      window.removeEventListener('resize', onScrollOrResize)
      window.removeEventListener('scroll', onScrollOrResize, true)
    }
  }, [open, actualizarPosicionMenu, opcionesFiltradas.length])

  useEffect(() => {
    const handleClickOutside = (e) => {
      const target = e.target
      if (wrapperRef.current?.contains(target)) return
      if (listRef.current?.contains(target)) return
      setOpen(false)
      setQuery('')
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const elegir = (option) => {
    if (option.disabled) return
    onChange(String(option.value))
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  const abrirLista = () => {
    if (disabled) return
    setOpen(true)
  }

  const limpiar = () => {
    if (query) {
      setQuery('')
      setOpen(true)
      inputRef.current?.focus()
      return
    }
    onChange('')
    setQuery('')
    setOpen(false)
  }

  const listaDesplegable =
    open && !disabled && menuRect
      ? createPortal(
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            style={{
              position: 'fixed',
              top: menuRect.top,
              left: menuRect.left,
              width: menuRect.width,
              zIndex: 9999,
            }}
            className={cn(surfacePopover, 'max-h-56 overflow-y-auto p-1')}
          >
            {opcionesFiltradas.length === 0 ? (
              <li className="px-3 py-2.5 text-sm text-slate-500">{noResultsLabel}</li>
            ) : (
              opcionesFiltradas.map((option) => {
                const activa = String(option.value) === String(value)
                return (
                  <li key={option.value} role="option" aria-selected={activa}>
                    <button
                      type="button"
                      disabled={option.disabled}
                      onClick={() => elegir(option)}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                        option.disabled
                          ? 'cursor-not-allowed text-slate-400'
                          : activa
                            ? 'bg-brand-50 font-medium text-brand-800'
                            : 'text-slate-700 hover:bg-slate-100'
                      )}
                    >
                      <span className="truncate">{option.label}</span>
                      {activa ? <IconCheck className="h-4 w-4 shrink-0 text-brand-600" strokeWidth={2} /> : null}
                    </button>
                  </li>
                )
              })
            )}
          </ul>,
          document.body
        )
      : null

  return (
    <div className="relative">
      {label && (
        <label htmlFor={`${id ?? reactId}-search`} className={labelClass}>
          {label}
          {required ? <span className="text-red-500"> *</span> : null}
        </label>
      )}

      <div ref={wrapperRef} className="relative min-w-0">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          id={`${id ?? reactId}-search`}
          type="search"
          value={valorInput}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={abrirLista}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(inputClass, 'pl-9 pr-9')}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
        />
        {puedeLimpiar && (
          <button
            type="button"
            aria-label={query ? 'Borrar búsqueda' : 'Quitar selección'}
            className={btnLimpiar}
            onClick={limpiar}
          >
            <IconX className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        )}
      </div>

      {mostrarBotonDetalle && (
        <Button variant="secondary" block onClick={onVerDetalle} className="mt-2">
          {verDetalleLabel}
        </Button>
      )}

      {required && (
        <input
          type="text"
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute h-0 w-0 opacity-0"
          value={value ?? ''}
          required
          onChange={() => {}}
        />
      )}

      {listaDesplegable}
    </div>
  )
}
