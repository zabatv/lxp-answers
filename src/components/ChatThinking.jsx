import { useEffect, useState } from 'react'
import ThoughtLine from './reactbits/ThoughtLine.jsx'

// Ход мыслей LXP AI (ReactBits ThoughtLine): пока ждём ответ — дышащая строка и шаги по очереди,
// после ответа — свёрнутое «Думал N с», которое можно раскрыть.
const STEPS = ['Читаю вопрос', 'Ищу похожие задания на сайте', 'Открываю решение с сайта', 'Собираю ответ']
const STEP_MS = 2200

// Gemini ещё проверяет вычисления кодом и умеет искать в Google
export function thinkSteps(model, web) {
  const steps = model === 'gemini' || web ? [...STEPS.slice(0, 3), 'Проверяю вычисления кодом', STEPS[3]] : STEPS
  return web ? [steps[0], 'Ищу в Google', ...steps.slice(1)] : steps
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
      glyphColor="#ffd60a"
      fontSize={13.5}
    />
  )
}
