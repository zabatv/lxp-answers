import { useEffect, useState } from 'react'
import ThoughtLine from './reactbits/ThoughtLine.jsx'

// Ход мыслей LXP AI (ReactBits ThoughtLine): пока ждём ответ — дышащая строка и шаги по очереди,
// после ответа — свёрнутое «Думал N с», которое можно раскрыть.
const STEPS = {
  tools: ['Читаю вопрос', 'Ищу похожие задания на сайте', 'Открываю решение с сайта', 'Проверяю вычисления кодом', 'Собираю ответ'],
  fast: ['Читаю вопрос', 'Собираю ответ'],
}
const STEP_MS = 2200

export function thinkSteps(model, web) {
  const base = STEPS[model] || STEPS.tools
  return web ? [base[0], 'Ищу в Google', ...base.slice(1)] : base
}

export default function ChatThinking({ working, steps, startedAt, elapsedMs, wakeAttempt, attempts }) {
  const [shown, setShown] = useState(() =>
    working ? Math.min(steps.length, 1 + Math.floor((Date.now() - (startedAt || Date.now())) / STEP_MS)) : steps.length
  )

  // шаги появляются по одному, последний «висит», пока не придёт ответ
  useEffect(() => {
    if (!working) return undefined
    const t = setInterval(() => setShown((n) => Math.min(steps.length, n + 1)), STEP_MS)
    return () => clearInterval(t)
  }, [working, steps.length])

  const label = wakeAttempt > 1 ? `Сервер просыпается… попытка ${wakeAttempt} из ${attempts}` : 'LXP AI думает…'
  return (
    <ThoughtLine
      className="chat-thinking"
      label={label}
      doneLabel="Думал"
      steps={steps.slice(0, working ? shown : steps.length)}
      working={working}
      elapsed={working ? undefined : (elapsedMs || 0) / 1000}
      collapsible
      color="var(--muted)"
      glyphColor="#8fa2ff"
      fontSize={13.5}
    />
  )
}
