export { PERIODICIDAD_OPCIONES, TIPO_AJUSTE_OPCIONES, TIPO_AJUSTE_LABELS } from './contratoAumentosPreview'

export const SECCIONES_CONTRATO = [
  { id: 'partes', label: 'Partes', stepLabel: 'Partes' },
  { id: 'vigencia', label: 'Vigencia y monto', stepLabel: 'Vigencia' },
  { id: 'ajustes', label: 'Ajustes', stepLabel: 'Ajustes' },
  { id: 'documentacion', label: 'Documentación', stepLabel: 'Docs' },
  { id: 'resumen', label: 'Resumen', stepLabel: 'Resumen' },
]

export const formContratoInicial = {
  inquilino_id: '',
  propiedad_id: '',
  fecha_inicio: '',
  duracion_anios: '',
  fecha_fin: '',
  monto_alquiler: '',
  monto_alquiler_display: '',
  dia_vencimiento: '',
  periodicidad_key: 'anual',
  tipo_ajuste: 'ipc',
  observaciones: '',
  documento_visible_inquilino: true,
}
