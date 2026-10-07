// Клиент к прокси LXP AI (внутри — DeepSeek через opendeep, как в collablab: запрос идёт на сервер с opendeep,
// токен chat.deepseek.com хранится на сервере, не в браузере).
// Адрес прокси задаётся при сборке: Render → сайт → Environment → VITE_DEEPSEEK_PROXY

const MODEL_STORAGE = 'deepseek_model'
export const DEFAULT_MODEL = 'deepseek-chat' // также: deepseek-reasoner, deepseek-v4-pro

const PROXY =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_DEEPSEEK_PROXY) || ''

const NO_PROXY = 'LXP AI не подключён: не задан адрес прокси (переменная VITE_DEEPSEEK_PROXY)'

export function hasProxy() {
  return Boolean(PROXY)
}
export function getModel() {
  try { return localStorage.getItem(MODEL_STORAGE) || DEFAULT_MODEL } catch { return DEFAULT_MODEL }
}
export function setModel(m) {
  try { localStorage.setItem(MODEL_STORAGE, m) } catch { /* приватный режим */ }
}

// Контекст задания (условие с платформы, пометки, уникальные данные) дописывается к просьбе,
// чтобы LXP AI пересчитывал решение тем же методом — прокси менять не нужно.
function withContext(instruction, context) {
  if (!context) return instruction
  return (
    `${instruction}\n\n---\nКонтекст — задание с учебной платформы:\n${context}\n\n` +
    'Сохрани метод решения и оформление. Если меняются исходные данные — заново пересчитай ' +
    'все шаги (не подгоняй под старый ответ) и проверь итог подстановкой.'
  )
}

// Отправляет код + инструкцию на прокси, получает переписанный код.
export async function refineCode({ code, lang, instruction, model, context }) {
  if (!PROXY) {
    throw new Error(NO_PROXY)
  }
  const res = await fetch(PROXY.replace(/\/$/, '') + '/api/refine', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      lang,
      instruction: withContext(instruction, context),
      model: model || getModel(),
    }),
  })

  if (!res.ok) {
    let detail = ''
    try { detail = await res.text() } catch { /* ignore */ }
    throw new Error('Прокси ' + res.status + (detail ? ': ' + detail.slice(0, 200) : ''))
  }

  const data = await res.json()
  let out = (data && data.text) || ''
  out = out.replace(/^```[^\n]*\n?/, '').replace(/\n?```\s*$/, '').trim()
  return out
}

// Чат: вся история уходит на прокси, ответ — обычный текст (markdown).
export async function chat({ messages, model, signal }) {
  if (!PROXY) throw new Error(NO_PROXY)
  const res = await fetch(PROXY.replace(/\/$/, '') + '/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, model: model || getModel() }),
    signal,
  })
  if (!res.ok) {
    let detail = ''
    try { detail = await res.text() } catch { /* ignore */ }
    throw new Error('LXP AI: ошибка ' + res.status + (detail ? ' — ' + detail.slice(0, 200) : ''))
  }
  const data = await res.json()
  return ((data && data.text) || '').trim()
}
