import Logo from './Logo.jsx'

export function Brand({ compact = false }) {
  return (
    <div className={`brand${compact ? ' brand--compact' : ''}`}>
      <Logo className="brand-mark" size={compact ? 28 : 34} />
      <div className="brand-text">
        <div className="brand-name">
          <span className="brand-lxp">LXP</span> Ответы
        </div>
        {!compact && <div className="brand-sub">IThub · 2ИТП1.9.25</div>}
      </div>
    </div>
  )
}
