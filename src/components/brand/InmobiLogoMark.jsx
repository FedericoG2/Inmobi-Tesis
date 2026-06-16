/**
 * Isotipo INMOBI: casa + edificio (inmobiliaria / alquileres).
 */
export default function InmobiLogoMark({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 3.5 4.5 10.25V20a1 1 0 0 0 1 1H9v-5.5h6V20h3.5a1 1 0 0 0 1-1V10.25L12 3.5Z" />
      <path
        d="M16.25 9.5h4.75V20h-2.25v-6.75h-2.5V9.5Z"
        fillOpacity="0.45"
      />
    </svg>
  )
}
