import { useEffect, useState } from 'react'
import { Button } from '@tremor/react'
import { contarPropiedadesPorPropietario } from '../../services/propietariosService'
import { formatearDniCuit, formatearTelefono } from '../../utils/normalizarContacto'

const BADGE_TIPO = {
  Física: {
    label: 'Particular',
    className: 'bg-violet-600 text-white',
    avatarClass: 'rounded-full bg-violet-100 text-violet-700',
  },
  Jurídica: {
    label: 'Empresa',
    className: 'bg-teal-600 text-white',
    avatarClass: 'rounded-lg bg-teal-100 text-teal-700',
  },
}

function iniciales(nombre) {
  const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean)
  if (partes.length >= 2) {
    return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase()
  }
  return (nombre ?? '??').slice(0, 2).toUpperCase()
}

function IconBuilding({ className = 'h-5 w-5' }) {
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

function IconIdCard({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm3-9.75a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 3a2.25 2.25 0 0 0-2.25 2.25v.75a2.25 2.25 0 0 0 2.25 2.25h3a2.25 2.25 0 0 0 2.25-2.25v-.75A2.25 2.25 0 0 0 10.5 12.75h-3Z"
      />
    </svg>
  )
}

function IconPhone({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.72 1.062a12.042 12.042 0 0 1-7.21-7.21l1.062-.72c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
      />
    </svg>
  )
}

function IconEnvelope({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
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

function IconHome({ className = 'h-4 w-4' }) {
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

function etiquetaPropiedades(cantidad) {
  if (cantidad === 0) return 'Sin propiedades asociadas'
  if (cantidad === 1) return '1 propiedad asociada'
  return `${cantidad} propiedades asociadas`
}

export default function PropietarioDetalleModal({ open, propietario, onClose, onEdit }) {
  const [cantidadPropiedades, setCantidadPropiedades] = useState(null)
  const [cargandoPropiedades, setCargandoPropiedades] = useState(false)

  useEffect(() => {
    if (!open || !propietario?.id) {
      setCantidadPropiedades(null)
      setCargandoPropiedades(false)
      return
    }

    let activo = true
    setCargandoPropiedades(true)
    setCantidadPropiedades(null)

    contarPropiedadesPorPropietario(propietario.id).then((resultado) => {
      if (!activo) return
      setCargandoPropiedades(false)
      if (resultado.error) {
        setCantidadPropiedades(null)
        return
      }
      setCantidadPropiedades(resultado.propiedades)
    })

    return () => {
      activo = false
    }
  }, [open, propietario?.id])

  if (!open || !propietario) return null

  const estilo = BADGE_TIPO[propietario.tipo_persona] ?? BADGE_TIPO['Física']
  const esJuridica = propietario.tipo_persona === 'Jurídica'

  const textoPropiedades = cargandoPropiedades
    ? 'Consultando...'
    : cantidadPropiedades === null
      ? 'No disponible'
      : etiquetaPropiedades(cantidadPropiedades)

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
        aria-labelledby="propietario-detalle-titulo"
        className="relative z-10 w-full max-w-2xl rounded-2xl border border-slate-100 bg-white shadow-xl"
      >
        <div className="border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-4">
            <span
              className={`inline-flex h-12 w-12 shrink-0 items-center justify-center text-sm font-bold ${estilo.avatarClass}`}
            >
              {esJuridica ? (
                <IconBuilding />
              ) : (
                iniciales(propietario.nombre_completo)
              )}
            </span>

            <div className="min-w-0 flex-1">
              <h2
                id="propietario-detalle-titulo"
                className="truncate text-lg font-semibold text-slate-900"
              >
                {propietario.nombre_completo}
              </h2>
              <span
                className={`mt-1.5 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${estilo.className}`}
              >
                {estilo.label}
              </span>
            </div>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DetalleFila
              label={esJuridica ? 'CUIT' : 'DNI / CUIT'}
              value={formatearDniCuit(propietario.dni_cuit)}
              icon={IconIdCard}
            />
            <DetalleFila
              label="Teléfono"
              value={formatearTelefono(propietario.telefono)}
              icon={IconPhone}
            />
            <DetalleFila label="Email" value={propietario.email ?? '—'} icon={IconEnvelope} />
            <DetalleFila
              label="Domicilio"
              value={propietario.domicilio ?? '—'}
              icon={IconPin}
              truncateValue={false}
            />
            <DetalleFila
              label="Propiedades"
              value={textoPropiedades}
              icon={IconHome}
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
                onEdit(propietario)
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
