import { useId } from 'react'

// Знак сайта: градиентная плашка с «</>» (тот же рисунок, что и в public/favicon.svg).
export default function Logo({ size = 36, className = '' }) {
  const gid = 'lg' + useId().replace(/:/g, '')
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#8b7bff" />
          <stop offset="0.55" stopColor="#4cc9f0" />
          <stop offset="1" stopColor="#45e6b0" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill={`url(#${gid})`} />
      <rect x="1" y="1" width="62" height="62" rx="17" fill="none" stroke="#fff" strokeOpacity="0.28" strokeWidth="2" />
      <path
        d="M24 22 14 32l10 10M40 22l10 10-10 10M35.5 17l-7 30"
        fill="none"
        stroke="#0a0b12"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
