import { IconBuilding, IconCurrency, IconHome, IconUser } from '../icons/NavIcons'

export const propietarioNavItems = [
  { to: '/propietario/inicio', label: 'Inicio', icon: IconHome, end: true },
  { to: '/propietario/propiedades', label: 'Propiedades', icon: IconBuilding },
  { to: '/propietario/alquileres', label: 'Alquileres', icon: IconCurrency },
  { to: '/propietario/perfil', label: 'Perfil', icon: IconUser },
]
