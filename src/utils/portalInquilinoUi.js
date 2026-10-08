import {
  badgeClass,
  buttonClass,
  calloutClass,
  cn,
  inputClass,
  labelClass,
  loadingStateClass,
  pageSubtitle,
  pageTitle,
  sectionTitle,
  surfaceCard,
} from './ui'

/** Estilos del portal del inquilino: derivan de utils/ui.js para compartir el lenguaje del panel admin. */

export const portalPageShell = 'space-y-5 lg:space-y-6'

export const portalPageTitle = pageTitle

export const portalPageSubtitle = pageSubtitle

export const portalPageHeader =
  'flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'

export const portalCardClass = surfaceCard

export const portalSectionTitle = sectionTitle

export const portalSection = 'space-y-2.5'

export const portalMontoLg = 'text-2xl font-semibold tabular-nums tracking-tight text-slate-900 lg:text-3xl'

export const portalMontoMd = 'text-base font-semibold tabular-nums text-slate-900'

export const portalBadge = badgeClass('neutral')

export const portalBtnPrimary = buttonClass({ variant: 'primary', size: 'lg' })

export const portalBtnSecondary = buttonClass({ variant: 'secondary', className: 'flex-1' })

export const portalBtnDanger = buttonClass({ variant: 'dangerOutline', className: 'flex-1' })

export const portalBtnGhost = buttonClass({ variant: 'ghost' })

export const portalInputClass = inputClass

export const portalLabelClass = labelClass

export const portalEmptyState = cn(surfaceCard, 'px-5 py-10 text-center lg:py-12')

export const portalErrorState = calloutClass('danger')

export const portalLoadingState = loadingStateClass

export const portalGridPage = 'grid gap-5 lg:grid-cols-12 lg:gap-6'

export const portalColHalf = 'lg:col-span-6'

export const portalColMain = 'lg:col-span-7 xl:col-span-8'

export const portalColSide = 'lg:col-span-5 xl:col-span-4'

export const portalInfoGroupTitle =
  'px-4 pt-4 text-[11px] font-medium uppercase tracking-wider text-slate-500 lg:px-5'

export const portalInfoRow =
  'flex items-center justify-between gap-4 px-4 py-3 lg:px-5'

export const portalInfoLabel = 'text-sm text-slate-500'

export const portalInfoValue = 'text-right text-sm font-medium text-slate-900'
