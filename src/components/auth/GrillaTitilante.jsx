import { useEffect, useRef } from 'react'

/**
 * Grilla de puntos que titilan, dibujada en canvas.
 * Si el usuario pidió reducir el movimiento se dibuja una sola vez y queda quieta.
 */
export default function GrillaTitilante({
  className,
  color = '171, 185, 233',
  tamano = 2,
  separacion = 8,
  opacidadMax = 0.35,
  cambiosPorSegundo = 0.25,
}) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const paso = tamano + separacion
    let columnas = 0
    let filas = 0
    let opacidades = new Float32Array(0)
    let dpr = 1
    let frame = 0
    let anterior = performance.now()
    let ultimoDibujo = 0

    const dibujar = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = `rgb(${color})`
      for (let c = 0; c < columnas; c++) {
        for (let f = 0; f < filas; f++) {
          ctx.globalAlpha = opacidades[c * filas + f]
          ctx.fillRect(c * paso * dpr, f * paso * dpr, tamano * dpr, tamano * dpr)
        }
      }
      ctx.globalAlpha = 1
    }

    const medir = () => {
      const { width, height } = canvas.getBoundingClientRect()
      dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      columnas = Math.ceil(width / paso)
      filas = Math.ceil(height / paso)
      opacidades = Float32Array.from({ length: columnas * filas }, () => Math.random() * opacidadMax)
      dibujar()
    }

    const tick = (ahora) => {
      const dt = (ahora - anterior) / 1000
      anterior = ahora
      for (let i = 0; i < opacidades.length; i++) {
        if (Math.random() < cambiosPorSegundo * dt) opacidades[i] = Math.random() * opacidadMax
      }
      // ~20 cuadros por segundo alcanzan para el titileo y cuestan la tercera parte.
      if (ahora - ultimoDibujo > 50 && canvas.width > 0) {
        ultimoDibujo = ahora
        dibujar()
      }
      frame = requestAnimationFrame(tick)
    }

    const observador = new ResizeObserver(medir)
    observador.observe(canvas)
    medir()
    if (!quieto) frame = requestAnimationFrame(tick)

    return () => {
      observador.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [color, tamano, separacion, opacidadMax, cambiosPorSegundo])

  return <canvas ref={canvasRef} className={className} aria-hidden />
}
