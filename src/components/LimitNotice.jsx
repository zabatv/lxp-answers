import { useEffect, useState } from 'react'
import { Cancel01Icon, Clock01Icon, RefreshIcon } from '@hugeicons/core-free-icons'
import Icon from './Icon.jsx'

// Оповещение о лимите бесплатного ключа Gemini: обратный отсчёт и «Отправить ещё раз».
export default function LimitNotice({ until, onRetry, onClose }) {
  const left = () => Math.max(0, Math.ceil((until - Date.now()) / 1000))
  const [sec, setSec] = useState(left)
  const [total] = useState(left) // длительность полосы — один раз, чтобы анимация не перезапускалась

  useEffect(() => {
    setSec(left())
    const t = setInterval(() => setSec(left()), 250)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [until])

  const ready = sec === 0
  return (
    <div className="limit-notice" role="status" data-ready={ready ? '' : undefined}>
      <Icon icon={Clock01Icon} size={18} />
      <div className="limit-text">
        <strong>Бесплатный лимит Gemini на эту минуту закончился</strong>
        <span>
          {ready
            ? 'Лимит обновился — можно отправлять.'
            : `Бесплатный ключ даёт всего несколько запросов в минуту. Можно спросить снова через ${sec} с.`}
        </span>
      </div>
      {ready && (
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          <Icon icon={RefreshIcon} size={15} />
          Отправить ещё раз
        </button>
      )}
      <button type="button" className="icon-btn limit-close" onClick={onClose} aria-label="Закрыть оповещение">
        <Icon icon={Cancel01Icon} size={15} />
      </button>
      {!ready && <span className="limit-bar" style={{ animationDuration: `${total}s` }} key={until} />}
    </div>
  )
}
