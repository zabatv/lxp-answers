// Знак сайта: жёлтая плашка-маркер с «<X>» (код + X из LXP). Тот же рисунок — public/favicon.svg.
export default function Logo({ size = 36, className = '' }) {
  return (
    <svg className={`logo ${className}`} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="12" fill="#ffd60a" />
      <g fill="none" stroke="#171400" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 22 11 32l9 10M44 22l9 10-9 10" />
        <path d="M26 23.5 38 40.5M38 23.5 26 40.5" />
      </g>
    </svg>
  )
}
