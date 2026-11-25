import { EncabezadoPagina } from '../../contexts/EncabezadoContext'

/** Título, descripción y acción de la página del portal: se muestran en la barra superior. */
export default function PortalPageHeader({ title, subtitle, action }) {
  return <EncabezadoPagina titulo={title} subtitulo={subtitle} acciones={action} />
}
