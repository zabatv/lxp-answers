// Клиент к прокси LXP AI (внутри — DeepSeek через opendeep, как в collablab: запрос идёт на сервер с opendeep,
// токен chat.deepseek.com хранится на сервере, не в браузере).
// Адрес прокси задаётся при сборке: Render → сайт → Environment → VITE_DEEPSEEK_PROXY

const MODEL_STORAGE = 'deepseek_model'
export const DEFAULT_MODEL = 'deepseek-chat' // также: deepseek-reasoner, deepseek-v4-pro

const PROXY =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_DEEPSEEK_PROXY) || ''

const NO_PROXY = 'LXP AI не подключён: не задан адрес прокси (переменная VITE_DEEPSEEK_PROXY)'

export const proxyBase = () => PROXY.replace(/\/$/, '')

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

// Бесплатный сервер на Render засыпает без запросов и просыпается около минуты.
// Пока он спит, запрос падает (нет связи) или Render отдаёт 502/503/504 своей HTML-страницей.
export const CHAT_ATTEMPTS = 10
const RETRY_EVERY = 60_000 // попытки — раз в минуту

class Asleep extends Error {}

const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(t)
      reject(new DOMException('Отменено', 'AbortError'))
    }, { once: true })
  })

// будим сервер заранее — например, когда открыли вкладку чата
// заодно узнаём, какие запасные модели подключены на прокси: [{id, name}]
export async function wakeProxy() {
  if (!PROXY) return []
  try {
    const res = await fetch(PROXY.replace(/\/$/, '') + '/', { mode: 'cors' })
    const data = await res.json()
    return Array.isArray(data.providers) ? data.providers : []
  } catch {
    return []
  }
}

async function chatOnce({ messages, model, signal }) {
  let res
  try {
    res = await fetch(PROXY.replace(/\/$/, '') + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, model: model || getModel() }),
      signal,
    })
  } catch (err) {
    if (signal?.aborted) throw err
    throw new Asleep('нет связи с сервером')
  }
  if (!res.ok) {
    let detail = ''
    try { detail = await res.text() } catch { /* ignore */ }
    // ошибка самого прокси приходит JSON-ом {error}; HTML-страница 5xx — это Render, сервер ещё не проснулся
    let own = null
    try { own = JSON.parse(detail).error } catch { /* не JSON */ }
    if (!own && [502, 503, 504].includes(res.status)) throw new Asleep('сервер просыпается')
    throw new Error('LXP AI: ошибка ' + res.status + (own || detail ? ' — ' + String(own || detail).slice(0, 200) : ''))
  }
  const data = await res.json()
  // via — кто ответил: DeepSeek или запасной провайдер (Gemini, Groq…)
  return { text: ((data && data.text) || '').trim(), via: (data && data.via) || '' }
}

// Чат: вся история уходит на прокси, ответ — { text (markdown), via }.
// onRetry(attempt) вызывается перед каждой повторной попыткой (2…CHAT_ATTEMPTS).
export async function chat({ messages, model, signal, onRetry }) {
  if (!PROXY) throw new Error(NO_PROXY)
  for (let attempt = 1; ; attempt++) {
    const started = Date.now()
    try {
      return await chatOnce({ messages, model, signal })
    } catch (err) {
      if (!(err instanceof Asleep)) throw err
      if (attempt >= CHAT_ATTEMPTS) {
        throw new Error(`LXP AI не ответил за ${CHAT_ATTEMPTS} попыток — сервер так и не проснулся. Попробуй позже.`)
      }
      onRetry?.(attempt + 1)
      await sleep(Math.max(0, RETRY_EVERY - (Date.now() - started)), signal)
    }
  }
}
