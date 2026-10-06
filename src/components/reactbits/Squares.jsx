import { useRef, useEffect } from 'react'

// ReactBits "Squares" — animated grid background on a canvas (no dependencies).
export default function Squares({
  direction = 'diagonal',
  speed = 0.4,
  borderColor = 'rgba(124,123,255,0.15)',
  squareSize = 46,
  hoverFillColor = 'rgba(124,123,255,0.12)',
}) {
  const canvasRef = useRef(null)
  const requestRef = useRef(null)
  const gridOffset = useRef({ x: 0, y: 0 })
  const hovered = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    window.addEventListener('resize', resize)
    resize()

    const draw = () => {
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)

      const ox = gridOffset.current.x % squareSize
      const oy = gridOffset.current.y % squareSize

      for (let x = -squareSize; x < w + squareSize; x += squareSize) {
        for (let y = -squareSize; y < h + squareSize; y += squareSize) {
          const sx = x - ox
          const sy = y - oy
          if (
            hovered.current &&
            Math.floor((sx + ox) / squareSize) === hovered.current.x &&
            Math.floor((sy + oy) / squareSize) === hovered.current.y
          ) {
            ctx.fillStyle = hoverFillColor
            ctx.fillRect(sx, sy, squareSize, squareSize)
          }
          ctx.strokeStyle = borderColor
          ctx.strokeRect(sx, sy, squareSize, squareSize)
        }
      }

      const grad = ctx.createRadialGradient(
        w / 2, h / 2, 0,
        w / 2, h / 2, Math.sqrt(w * w + h * h) / 2
      )
      grad.addColorStop(0, 'rgba(8,8,16,0)')
      grad.addColorStop(1, 'rgba(8,8,16,0.92)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)
    }

    const update = () => {
      const s = Math.max(speed, 0.1)
      switch (direction) {
        case 'right': gridOffset.current.x -= s; break
        case 'left': gridOffset.current.x += s; break
        case 'up': gridOffset.current.y += s; break
        case 'down': gridOffset.current.y -= s; break
        default: gridOffset.current.x -= s; gridOffset.current.y -= s
      }
      draw()
      requestRef.current = requestAnimationFrame(update)
    }

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      hovered.current = {
        x: Math.floor((mx + (gridOffset.current.x % squareSize)) / squareSize),
        y: Math.floor((my + (gridOffset.current.y % squareSize)) / squareSize),
      }
    }
    const onLeave = () => { hovered.current = null }

    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseleave', onLeave)
    requestRef.current = requestAnimationFrame(update)

    return () => {
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mouseleave', onLeave)
      cancelAnimationFrame(requestRef.current)
    }
  }, [direction, speed, borderColor, squareSize, hoverFillColor])

  return <canvas ref={canvasRef} className="squares-canvas" />
}
