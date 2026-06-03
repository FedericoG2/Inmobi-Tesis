export default function ErrorFallback({ error }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-red-50 p-8">
      <h1 className="text-lg font-bold text-red-800">Error en la aplicación</h1>
      <p className="max-w-md text-center text-sm text-red-600">
        {error?.message ?? 'Ocurrió un error inesperado'}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
      >
        Recargar
      </button>
    </div>
  )
}
