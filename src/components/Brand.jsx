import Logo from './Logo.jsx'
import GradientText from './reactbits/GradientText.jsx'
import ShinyText from './reactbits/ShinyText.jsx'

const BRAND_GRADIENT = ['#8b7bff', '#4cc9f0', '#45e6b0', '#4cc9f0', '#8b7bff']

export function Brand({ compact = false }) {
  return (
    <div className={`brand${compact ? ' brand--compact' : ''}`}>
      <Logo className="brand-mark" size={compact ? 30 : 38} />
      <div className="brand-text">
        <div className="brand-name">
          <GradientText colors={BRAND_GRADIENT} animationSpeed={8}>LXP</GradientText> Ответы
        </div>
        {!compact && <ShinyText className="brand-sub" text="IThub · 2ИТП1.9.25" speed={5} />}
      </div>
    </div>
  )
}
