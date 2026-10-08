// Рассуждения «думающих» моделей (Qwen и др.) приходят в <think>…</think> перед ответом.
// Показываем их отдельно, свёрнутыми: ответ — главное, ход мыслей — по желанию.
export function splitThink(text) {
  const parts = []
  const answer = String(text || '').replace(/<think>([\s\S]*?)(?:<\/think>|$)/g, (_, t) => {
    if (t.trim()) parts.push(t.trim())
    return ''
  })
  return { think: parts.join('\n\n'), answer: answer.trim() }
}

export default function ChatReasoning({ text }) {
  if (!text) return null
  const words = text.split(/\s+/).filter(Boolean).length
  return (
    <details className="chat-reasoning">
      <summary>
        Рассуждения модели <span>· {words} сл.</span>
      </summary>
      <div className="chat-reasoning-text">{text}</div>
    </details>
  )
}
