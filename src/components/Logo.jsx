import { useId } from 'react'

// Знак сайта: тёмная стеклянная плашка с градиентной рамкой, светящийся «<X>»
// (код + X из LXP) и искра LXP AI. По рамке пробегает блик. Статичная версия — public/favicon.svg.
export default function Logo({ size = 36, className = '' }) {
  const id = 'lg' + useId().replace(/:/g, '')
  return (
    <svg className={`logo ${className}`} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#a594ff" />
          <stop offset="0.5" stopColor="#4cc9f0" />
          <stop offset="1" stopColor="#45e6b0" />
        </linearGradient>
        <radialGradient id={`${id}bg`} cx="0.3" cy="0.2" r="0.95">
          <stop offset="0" stopColor="#262a4a" />
          <stop offset="0.6" stopColor="#11131f" />
          <stop offset="1" stopColor="#090a12" />
        </radialGradient>
        {/* блик, который бежит по рамке */}
        <linearGradient id={`${id}s`} x1="-64" y1="0" x2="0" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
          <animateTransform
            attributeName="gradientTransform"
            type="translate"
            values="0 0; 128 0; 128 0"
            keyTimes="0; 0.45; 1"
            dur="4.5s"
            repeatCount="indefinite"
          />
        </linearGradient>
        <filter id={`${id}glow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect x="1.5" y="1.5" width="61" height="61" rx="17" fill={`url(#${id}bg)`} />
      <rect x="1.5" y="1.5" width="61" height="61" rx="17" fill="none" stroke={`url(#${id}g)`} strokeWidth="2.5" />
      <rect x="1.5" y="1.5" width="61" height="61" rx="17" fill="none" stroke={`url(#${id}s)`} strokeWidth="2.5" />

      <g filter={`url(#${id}glow)`} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 22 11 32l9 10M44 22l9 10-9 10" stroke={`url(#${id}g)`} strokeWidth="4.5" />
        <path d="M26 23.5 38 40.5" stroke="#fff" strokeWidth="4.5" />
        <path d="M38 23.5 26 40.5" stroke={`url(#${id}g)`} strokeWidth="4.5" />
      </g>

      <path
        className="logo-spark"
        d="M50 7.5c.4 2.9 1.6 4.1 4.5 4.5-2.9.4-4.1 1.6-4.5 4.5-.4-2.9-1.6-4.1-4.5-4.5 2.9-.4 4.1-1.6 4.5-4.5z"
        fill="#fff"
      />
    </svg>
  )
}
