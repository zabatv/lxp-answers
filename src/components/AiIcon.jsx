// Значок LXP AI — две искры в фирменном градиенте сайта
export default function AiIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="lxp-ai-grad" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8b7bff" />
          <stop offset="0.55" stopColor="#5b8cff" />
          <stop offset="1" stopColor="#45e6b0" />
        </linearGradient>
      </defs>
      <path
        d="M10 3.5c.5 3.6 2.4 5.5 6 6-3.6.5-5.5 2.4-6 6-.5-3.6-2.4-5.5-6-6 3.6-.5 5.5-2.4 6-6z"
        fill="url(#lxp-ai-grad)"
      />
      <path d="M18 13.5c.3 1.9 1.1 2.7 3 3-1.9.3-2.7 1.1-3 3-.3-1.9-1.1-2.7-3-3 1.9-.3 2.7-1.1 3-3z" fill="url(#lxp-ai-grad)" />
    </svg>
  )
}
