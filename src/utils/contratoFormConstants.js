export { PERIODICIDAD_OPCIONES, TIPO_AJUSTE_OPCIONES, TIPO_AJUSTE_LABELS } from './contratoAumentosPreview'

export const SECCIONES_CONTRATO = [
  { id: 'partes', label: 'Partes y vigencia' },
  { id: 'valor', label: 'Valor y ajuste' },
  { id: 'documentacion', label: 'Documentación' },
  { id: 'resumen', label: 'Resumen' },
]

export const formContratoInicial = {
  inquilino_id: '',
  propiedad_id: '',
  fecha_inicio: '',
  duracion_anios: '',
  fecha_fin: '',
  monto_alquiler: '',
  monto_alquiler_display: '',
  dia_vencimiento: '10',
  periodicidad_key: 'anual',
  tipo_ajuste: 'ipc',
  observaciones: '',
  documento_visible_inquilino: true,
}
