import { useEffect, useState } from 'react'
import { Button } from '@tremor/react'
import { contarDependenciasPropiedad } from '../../services/propiedadesService'
import { etiquetaPropietario } from '../../utils/etiquetaPropietario'

const ESTILO_TIPO = {
  Departamento: {
    label: 'Departamento',
    iconClass: 'rounded-lg bg-indigo-100 text-indigo-700',
    badgeClass: 'bg-indigo-600 text-white',
    Icon: IconDepartamento,
  },
  Casa: {
    label: 'Casa',
    iconClass: 'rounded-lg bg-orange-100 text-orange-700',
    badgeClass: 'bg-orange-600 text-white',
    Icon: IconCasa,
  },
  'Local comercial': {
    label: 'Local comercial',
    iconClass: 'rounded-lg bg-slate-100 text-slate-700',
    badgeClass: 'bg-slate-600 text-white',
    Icon: IconLocal,
  },
}

const ESTILO_ESTADO = {
  Disponible: { label: 'Disponible', className: 'bg-emerald-600 text-white' },
  Alquilada: { label: 'Alquilada', className: 'bg-blue-600 text-white' },
  Mantenimiento: { label: 'Mantenimiento', className: 'bg-amber-500 text-white' },
}

function IconDepartamento({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 21h16.5M4.5 3h15v18h-15V3Zm3 3h1.5v1.5H7.5V6Zm0 3h1.5v1.5H7.5V9Zm0 3h1.5v1.5H7.5V12Zm3-6H12v1.5H10.5V6Zm0 3H12v1.5h-1.5V9Zm0 3H12v1.5h-1.5V12Zm3-6h1.5v1.5H13.5V6Zm0 3h1.5v1.5H13.5V9Zm0 3h1.5v1.5H13.5V12Zm3-6H19.5v1.5H16.5V6Zm0 3H19.5v1.5H16.5V9Zm0 3H19.5v1.5H16.5V12Z"
      />
    </svg>
  )
}

function IconCasa({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
      />
    </svg>
  )
}

function IconLocal({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-9-10.5H3.375c-.621 0-1.125.504-1.125 1.125v3.375c0 .621.504 1.125 1.125 1.125h16.125c.621 0 1.125-.504 1.125-1.125V11.625c0-.621-.504-1.125-1.125-1.125H13.5m-3-10.5V21m4.5-7.5v7.5m-9 0h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5A2.25 2.25 0 0 0 6.75 19.5Z"
      />
    </svg>
  )
}

function IconPin({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
      />
    </svg>
  )
}

function IconUser({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
      />
    </svg>
  )
}

function IconLayers({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3"
      />
    </svg>
  )
}

function IconDoor({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18"
      />
    </svg>
  )
}

function IconCity({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 21h19.5M3 10.5h1.5M3 15h1.5M3 6h1.5M7.5 10.5h1.5M7.5 15h1.5M7.5 6h1.5M12 10.5h1.5M12 15h1.5M12 6h1.5M16.5 10.5h1.5M16.5 15h1.5M16.5 6h1.5M21 10.5h-1.5M21 15h-1.5M21 6h-1.5"
      />
    </svg>
  )
}

function IconDocument({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
      />
    </svg>
  )
}

function IconWrench({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.51m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z"
      />
    </svg>
  )
}

function DetalleFila({ label, value, icon: Icon, className = '', truncateValue = true }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 ${className}`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 ring-1 ring-slate-100">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p
          className={`text-sm font-medium text-slate-800 ${
            truncateValue ? 'truncate' : 'break-words'
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  )
}

function tituloPrincipal(propiedad) {
  if (propiedad.calle && propiedad.altura) {
    return `${propiedad.calle} ${propiedad.altura}`
  }
  return propiedad.direccion ?? 'Propiedad'
}

function valorOpcional(valor) {
  const v = (valor ?? '').trim()
  return v || '—'
}

function etiquetaContratos(deps) {
  if (!deps) return 'No disponible'
  const partes = []
  if (deps.contratos_activos > 0) {
    const n = deps.contratos_activos
    partes.push(`${n} contrato${n > 1 ? 's' : ''} activo${n > 1 ? 's' : ''}`)
  }
  if (deps.contratos_historicos > 0) {
    const n = deps.contratos_historicos
    partes.push(`${n} histórico${n > 1 ? 's' : ''}`)
  }
  if (partes.length === 0) return 'Sin contratos asociados'
  return partes.join(' · ')
}

function etiquetaReclamos(cantidad) {
  if (cantidad === 0) return 'Sin reclamos asociados'
  if (cantidad === 1) return '1 reclamo asociado'
  return `${cantidad} reclamos asociados`
}

export default function PropiedadDetalleModal({ open, propiedad, onClose, onEdit }) {
  const [dependencias, setDependencias] = useState(null)
  const [cargandoDeps, setCargandoDeps] = useState(false)

  useEffect(() => {
    if (!open || !propiedad?.id) {
      setDependencias(null)
      setCargandoDeps(false)
      return
    }

    let activo = true
    setCargandoDeps(true)
    setDependencias(null)

    contarDependenciasPropiedad(propiedad.id).then((resultado) => {
      if (!activo) return
      setCargandoDeps(false)
      if (resultado.error) {
        setDependencias(null)
        return
      }
      setDependencias(resultado)
    })

    return () => {
      activo = false
    }
  }, [open, propiedad?.id])

  if (!open || !propiedad) return null

  const estiloTipo = ESTILO_TIPO[propiedad.tipo] ?? {
    label: propiedad.tipo,
    iconClass: 'rounded-lg bg-slate-100 text-slate-700',
    badgeClass: 'bg-slate-600 text-white',
    Icon: IconDepartamento,
  }
  const estiloEstado = ESTILO_ESTADO[propiedad.estado] ?? {
    label: propiedad.estado,
    className: 'bg-slate-600 text-white',
  }
  const IconoTipo = estiloTipo.Icon

  const textoContratos = cargandoDeps ? 'Consultando...' : etiquetaContratos(dependencias)
  const textoReclamos = cargandoDeps
    ? 'Consultando...'
    : dependencias === null
      ? 'No disponible'
      : etiquetaReclamos(dependencias.reclamos ?? 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar detalle"
        className="fixed inset-0 bg-slate-900/50"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="propiedad-detalle-titulo"
        className="relative z-10 w-full max-w-2xl rounded-2xl border border-slate-100 bg-white shadow-xl"
      >
        <div className="border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-4">
            <span
              className={`inline-flex h-12 w-12 shrink-0 items-center justify-center ${estiloTipo.iconClass}`}
            >
              <IconoTipo />
            </span>

            <div className="min-w-0 flex-1">
              <h2
                id="propiedad-detalle-titulo"
                className="truncate text-lg font-semibold text-slate-900"
              >
                {tituloPrincipal(propiedad)}
              </h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${estiloTipo.badgeClass}`}
                >
                  {estiloTipo.label}
                </span>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${estiloEstado.className}`}
                >
                  {estiloEstado.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DetalleFila label="Calle" value={propiedad.calle ?? '—'} icon={IconPin} />
            <DetalleFila label="Altura" value={propiedad.altura ?? '—'} icon={IconPin} />
            <DetalleFila label="Piso" value={valorOpcional(propiedad.piso)} icon={IconLayers} />
            <DetalleFila label="Unidad" value={valorOpcional(propiedad.unidad)} icon={IconDoor} />
            <DetalleFila label="Ciudad" value={propiedad.ciudad ?? '—'} icon={IconCity} />
            <DetalleFila
              label="Propietario"
              value={etiquetaPropietario(propiedad)}
              icon={IconUser}
            />
            <DetalleFila
              label="Contratos"
              value={textoContratos}
              icon={IconDocument}
              className="sm:col-span-2"
            />
            <DetalleFila
              label="Reclamos"
              value={textoReclamos}
              icon={IconWrench}
              className="sm:col-span-2"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-3">
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          {onEdit && (
            <Button
              onClick={() => {
                onClose()
                onEdit(propiedad)
              }}
            >
              Editar
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
