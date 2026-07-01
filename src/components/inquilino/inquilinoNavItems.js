import { IconDocument, IconHome, IconUser, IconWrench } from '../icons/NavIcons'

export const inquilinoNavItems = [
  { to: '/inquilino/dashboard', label: 'Inicio', icon: IconHome, end: true },
  { to: '/inquilino/contrato', label: 'Contrato', icon: IconDocument },
  { to: '/inquilino/reclamos', label: 'Reclamos', icon: IconWrench },
  { to: '/inquilino/perfil', label: 'Perfil', icon: IconUser },
]
