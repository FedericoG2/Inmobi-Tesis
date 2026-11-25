import { EncabezadoPagina } from '../../contexts/EncabezadoContext'

/** Título, descripción y acciones del módulo: se muestran en la barra superior. */
export default function AdminModuleHeader({ title, subtitle, titleAction, actions }) {
  return <EncabezadoPagina titulo={title} subtitulo={subtitle} accionTitulo={titleAction} acciones={actions} />
}
