import { useEffect, useState } from 'react'
import { Button } from '@tremor/react'
import { contarDependenciasInquilino } from '../../services/inquilinosService'
import { formatearDniCuit } from '../../utils/normalizarContacto'

const ESTILO_TIPO = {
  Física: {
    label: 'Particular',
    iconClass: 'rounded-full bg-violet-100 text-violet-700 text-sm font-bold',
    badgeClass: 'bg-violet-600 text-white',
  },
  Jurídica: {
    label: 'Empresa',
    iconClass: 'rounded-lg bg-teal-100 text-teal-700',
    badgeClass: 'bg-teal-600 text-white',
  },
}

const ESTILO_GARANTIA = {
  Propietaria: { label: 'Propietaria', className: 'bg-indigo-600 text-white' },
  'Recibos de Sueldo': { label: 'Recibo de Sueldo', className: 'bg-sky-600 text-white' },
  'Aval Bancario': { label: 'Aval Bancario', className: 'bg-blue-600 text-white' },
  Otro: { label: 'Otro / Caución', className: 'bg-teal-600 text-white' },
}

function iniciales(nombre) {
  const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean)
  if (partes.length >= 2) {
    return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase()
  }
  return (nombre ?? '??').slice(0, 2).toUpperCase()
}

function IconBuilding({ className = 'h-6 w-6' }) {
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

function IconBriefcase({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0"
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
      className={`flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2 ${className}`}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 ring-1 ring-slate-100">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p
          className={`text-sm font-medium leading-tight text-slate-800 ${
            truncateValue ? 'truncate' : 'break-words'
          }`}
          title={truncateValue && typeof value === 'string' ? value : undefined}
        >
          {value}
        </p>
      </div>
    </div>
  )
}

function valorOpcional(valor) {
  const v = (valor ?? '').trim()
  return v || '—'
}

function formatearFecha(fecha) {
  if (!fecha) return '—'
  const partes = String(fecha).split('-')
  if (partes.length !== 3) return fecha
  return `${partes[2]}/${partes[1]}/${partes[0]}`
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

export default function InquilinoDetalleModal({ open, inquilino, onClose, onEdit, apilado = false }) {
  const [dependencias, setDependencias] = useState(null)
  const [cargandoDeps, setCargandoDeps] = useState(false)

  useEffect(() => {
    if (!open || !inquilino?.id) {
      setDependencias(null)
      setCargandoDeps(false)
      return
    }

    let activo = true
    setCargandoDeps(true)
    setDependencias(null)

    contarDependenciasInquilino(inquilino.id).then((resultado) => {
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
  }, [open, inquilino?.id])

  if (!open || !inquilino) return null

  const estiloTipo = ESTILO_TIPO[inquilino.tipo_persona] ?? ESTILO_TIPO['Física']
  const estiloGarantia = ESTILO_GARANTIA[inquilino.tipo_garantia] ?? {
    label: inquilino.tipo_garantia ?? '—',
    className: 'bg-slate-600 text-white',
  }
  const esJuridica = inquilino.tipo_persona === 'Jurídica'

  const textoContratos = cargandoDeps ? 'Consultando...' : etiquetaContratos(dependencias)
  const textoReclamos = cargandoDeps
    ? 'Consultando...'
    : dependencias === null
      ? 'No disponible'
      : etiquetaReclamos(dependencias.reclamos ?? 0)

  const textoEmergencia = [inquilino.emergencia_nombre, inquilino.emergencia_telefono]
    .map((v) => (v ?? '').trim())
    .filter(Boolean)
    .join(' · ') || '—'

  return (
    <div className={`fixed inset-0 ${apilado ? 'z-[60]' : 'z-50'} flex items-center justify-center p-4`}>
      <button
        type="button"
        aria-label="Cerrar detalle"
        className="fixed inset-0 bg-slate-900/50"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="inquilino-detalle-titulo"
        className="relative z-10 w-full max-w-2xl rounded-2xl border border-slate-100 bg-white shadow-xl"
      >
        <div className="border-b border-slate-100 px-6 py-3">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center text-sm ${estiloTipo.iconClass}`}
            >
              {esJuridica ? <IconBuilding className="h-5 w-5" /> : iniciales(inquilino.nombre_completo)}
            </span>

            <div className="min-w-0 flex-1">
              <h2
                id="inquilino-detalle-titulo"
                className="truncate text-base font-semibold text-slate-900"
              >
                {inquilino.nombre_completo}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${estiloTipo.badgeClass}`}
                >
                  {estiloTipo.label}
                </span>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${estiloGarantia.className}`}
                >
                  {estiloGarantia.label}
                </span>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    inquilino.perfil_id ? 'bg-emerald-600 text-white' : 'bg-slate-400 text-white'
                  }`}
                >
                  {inquilino.perfil_id ? 'Portal activo' : 'Sin acceso'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <DetalleFila
              label={esJuridica ? 'CUIT' : 'DNI / CUIT'}
              value={formatearDniCuit(inquilino.dni_cuit)}
              icon={IconIdCard}
            />
            <DetalleFila
              label="Teléfono"
              value={valorOpcional(inquilino.telefono)}
              icon={IconPhone}
            />
            <DetalleFila label="Email" value={inquilino.email ?? '—'} icon={IconEnvelope} />
            <DetalleFila
              label={esJuridica ? 'Rubro' : 'Ocupación'}
              value={valorOpcional(inquilino.ocupacion)}
              icon={IconBriefcase}
            />

            {!esJuridica && (
              <>
                <DetalleFila
                  label="Nacimiento"
                  value={formatearFecha(inquilino.fecha_nacimiento)}
                  icon={IconIdCard}
                />
                <DetalleFila
                  label="Estado civil"
                  value={inquilino.estado_civil ?? '—'}
                  icon={IconUser}
                />
              </>
            )}

            <DetalleFila
              label="Emergencia"
              value={textoEmergencia}
              icon={IconUser}
              className="sm:col-span-2"
            />

            {inquilino.observaciones && (
              <DetalleFila
                label="Observaciones"
                value={inquilino.observaciones}
                icon={IconDocument}
                className="sm:col-span-2"
              />
            )}

            <DetalleFila label="Contratos" value={textoContratos} icon={IconDocument} />
            <DetalleFila label="Reclamos" value={textoReclamos} icon={IconWrench} />
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
                onEdit(inquilino)
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
