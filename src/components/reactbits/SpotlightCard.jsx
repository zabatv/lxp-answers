import { useRef } from 'react'

// ReactBits "Spotlight Card" — radial glow follows the cursor.
// `as` — тег обёртки (например, 'button'), остальные пропсы уходят на него.
export default function SpotlightCard({
  children,
  className = '',
  spotlightColor = 'rgba(139,123,255,0.18)',
  as: Tag = 'div',
  ...rest
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
    <Tag ref={ref} onMouseMove={onMove} className={`spotlight-card ${className}`} {...rest}>
      {children}
    </Tag>
  )
}
