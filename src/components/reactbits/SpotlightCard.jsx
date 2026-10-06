import { useRef } from 'react'

// ReactBits "Spotlight Card" — radial glow follows the cursor.
export default function SpotlightCard({
  children,
  className = '',
  spotlightColor = 'rgba(124,123,255,0.22)',
}) {
  const ref = useRef(null)

  const onMove = (e) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mouse-x', `${e.clientX - r.left}px`)
    el.style.setProperty('--mouse-y', `${e.clientY - r.top}px`)
    el.style.setProperty('--spotlight-color', spotlightColor)
  }

  return (
    <div ref={ref} onMouseMove={onMove} className={`spotlight-card ${className}`}>
      {children}
    </div>
  )
}
