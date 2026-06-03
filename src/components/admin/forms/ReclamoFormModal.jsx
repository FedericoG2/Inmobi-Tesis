import { useEffect, useMemo, useState } from 'react'
import { Button } from '@tremor/react'
import {
  buscarContratoActivoPorInquilino,
  inquilinosConContratoActivo,
} from '../../../utils/contratoActivo'

const estados = ['Pendiente', 'En Proceso', 'Resuelto']

const formInicial = {
  inquilino_id: '',
  propiedad_id: '',
  titulo: '',
  descripcion: '',
  estado: 'Pendiente',
}

const inputClass =
  'w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'

const readOnlyClass =
  'w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700'

function formDesdeReclamo(reclamo) {
  return {
    inquilino_id: String(reclamo.inquilino_id ?? ''),
    propiedad_id: String(reclamo.propiedad_id ?? ''),
    titulo: reclamo.titulo ?? '',
    descripcion: reclamo.descripcion ?? '',
    estado: reclamo.estado ?? 'Pendiente',
  }
}

export default function ReclamoFormModal({
  open,
  onClose,
  onSubmit,
  submitting,
  submitError,
  reclamo = null,
  inquilinos,
  inquilinosLoading,
  contratos,
  contratosLoading,
}) {
  const [form, setForm] = useState(formInicial)
  const esEdicion = Boolean(reclamo)

  const inquilinosElegibles = useMemo(
    () => inquilinosConContratoActivo(inquilinos, contratos),
    [inquilinos, contratos]
  )

  useEffect(() => {
    if (!open) {
      setForm(formInicial)
      return
    }
    setForm(esEdicion ? formDesdeReclamo(reclamo) : formInicial)
  }, [open, reclamo, esEdicion])

  if (!open) return null

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleInquilinoChange = (e) => {
    const inquilinoId = e.target.value
    const contrato = buscarContratoActivoPorInquilino(contratos, inquilinoId)

    setForm((prev) => ({
      ...prev,
      inquilino_id: inquilinoId,
      propiedad_id: contrato ? String(contrato.propiedad_id) : '',
      estado: 'Pendiente',
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const ok = await onSubmit(form)
    if (ok) onClose()
  }

  const sinInquilinosElegibles = !inquilinosLoading && inquilinosElegibles.length === 0
  const contratoVinculado = buscarContratoActivoPorInquilino(contratos, form.inquilino_id)
  const sinContratoActivo =
    Boolean(form.inquilino_id) && !contratosLoading && !contratoVinculado
  const formDeshabilitadoCrear =
    sinInquilinosElegibles || sinContratoActivo || !form.propiedad_id
  const formDeshabilitado = esEdicion ? false : formDeshabilitadoCrear

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar modal"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">
          {esEdicion ? 'Editar reclamo' : 'Agregar reclamo'}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {esEdicion
            ? 'El inquilino y la propiedad no se modifican. Podés cambiar título, descripción y estado.'
            : 'Se vincula al contrato activo del inquilino. El reclamo inicia en Pendiente.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="inquilino_id" className="mb-1 block text-sm font-medium text-slate-700">
              Inquilino
            </label>
            {esEdicion ? (
              <input
                id="inquilino_id"
                type="text"
                readOnly
                value={reclamo.inquilinos?.nombre_completo ?? '—'}
                className={readOnlyClass}
              />
            ) : inquilinosLoading || contratosLoading ? (
              <p className="text-sm text-slate-500">Cargando inquilinos...</p>
            ) : sinInquilinosElegibles ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                No hay inquilinos con contrato activo. Creá un contrato vigente antes de registrar
                un reclamo.
              </p>
            ) : (
              <select
                id="inquilino_id"
                required
                value={form.inquilino_id}
                onChange={handleInquilinoChange}
                className={inputClass}
              >
                <option value="">Seleccioná un inquilino</option>
                {inquilinosElegibles.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nombre_completo}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label htmlFor="propiedad_vinculada" className="mb-1 block text-sm font-medium text-slate-700">
              Propiedad vinculada
            </label>
            {esEdicion ? (
              <input
                id="propiedad_vinculada"
                type="text"
                readOnly
                value={reclamo.propiedades?.direccion ?? '—'}
                className={readOnlyClass}
              />
            ) : contratosLoading ? (
              <p className="text-sm text-slate-500">Buscando contrato activo...</p>
            ) : !form.inquilino_id ? (
              <input
                id="propiedad_vinculada"
                type="text"
                readOnly
                value=""
                placeholder="Seleccioná un inquilino primero"
                className={readOnlyClass}
              />
            ) : sinContratoActivo ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Este inquilino no tiene un contrato activo. Creá un contrato vigente o reactivá la
                gestión antes de registrar el reclamo.
              </p>
            ) : (
              <input
                id="propiedad_vinculada"
                type="text"
                readOnly
                value={contratoVinculado.propiedades?.direccion ?? '—'}
                className={readOnlyClass}
              />
            )}
          </div>

          <div>
            <label htmlFor="titulo" className="mb-1 block text-sm font-medium text-slate-700">
              Título
            </label>
            <input
              id="titulo"
              type="text"
              required
              value={form.titulo}
              onChange={handleChange('titulo')}
              className={inputClass}
              placeholder="Falta de presión de agua"
              disabled={formDeshabilitado}
            />
          </div>

          <div>
            <label htmlFor="descripcion" className="mb-1 block text-sm font-medium text-slate-700">
              Descripción
            </label>
            <textarea
              id="descripcion"
              required
              rows={3}
              value={form.descripcion}
              onChange={handleChange('descripcion')}
              className={inputClass}
              placeholder="Desde hace dos días sale un hilo de agua..."
              disabled={formDeshabilitado}
            />
          </div>

          <div>
            <label htmlFor="estado" className="mb-1 block text-sm font-medium text-slate-700">
              Estado
            </label>
            {esEdicion ? (
              <select
                id="estado"
                required
                value={form.estado}
                onChange={handleChange('estado')}
                className={inputClass}
              >
                {estados.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="estado"
                type="text"
                readOnly
                value="Pendiente"
                className={readOnlyClass}
              />
            )}
          </div>

          {submitError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{submitError}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" loading={submitting} disabled={submitting || formDeshabilitado}>
              {esEdicion ? 'Guardar cambios' : 'Guardar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
