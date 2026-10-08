// Клиент к прокси LXP AI. Внутри — Gemini (Google AI Studio): ключ хранится на сервере, не в браузере.
// Адрес прокси задаётся при сборке: Render → сайт → Environment → VITE_DEEPSEEK_PROXY
// (имя переменной осталось от прежней версии, чтобы не перенастраивать Render).

const env = (typeof import.meta !== 'undefined' && import.meta.env) || {}
const PROXY = env.VITE_AI_PROXY || env.VITE_DEEPSEEK_PROXY || ''
const NO_PROXY = 'LXP AI не подключён: не задан адрес прокси (переменная VITE_DEEPSEEK_PROXY)'

export const proxyBase = () => PROXY.replace(/\/$/, '')

export function hasProxy() {
  return Boolean(PROXY)
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

// Бесплатный сервер на Render засыпает без запросов и просыпается около минуты.
// Пока он спит, запрос падает (нет связи) или Render отдаёт 502/503/504 своей HTML-страницей.
export const CHAT_ATTEMPTS = 10
const RETRY_EVERY = 60_000 // попытки — раз в минуту

class Asleep extends Error {}

const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t)
        reject(new DOMException('Отменено', 'AbortError'))
      },
      { once: true }
    )
  })

// будим сервер заранее — например, когда открыли вкладку чата
export async function wakeProxy() {
  if (!PROXY) return null
  try {
    const res = await fetch(proxyBase() + '/', { mode: 'cors' })
    return await res.json()
  } catch {
    return null
  }
}

// Модели, подключённые на прокси (у которых есть ключ): [{ id, name, tag, provider }].
// Запрос один на вкладку — его делят чат и кнопки LXP AI у файлов.
let modelsPromise = null
export function getModels() {
  if (!modelsPromise) {
    modelsPromise = wakeProxy().then((data) => (Array.isArray(data?.models) ? data.models : []))
    modelsPromise.then((list) => {
      if (!list.length) modelsPromise = null // сервер спал — спросим ещё раз в следующий раз
    })
  }
  return modelsPromise
}

// выбранная модель запоминается в браузере — одна на чат и правку кода
const MODEL_KEY = 'lxp-model'
export function savedModel() {
  try { return localStorage.getItem(MODEL_KEY) || '' } catch { return '' }
}
export function saveModel(id) {
  try { localStorage.setItem(MODEL_KEY, id) } catch { /* приватный режим */ }
}

async function postOnce(path, payload, signal) {
  let res
  try {
    res = await fetch(proxyBase() + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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
    let parsed = null
    try {
      parsed = JSON.parse(detail)
      own = parsed.error
    } catch { /* не JSON */ }
    if (!own && [502, 503, 504].includes(res.status)) throw new Asleep('сервер просыпается')
    const err = new Error(own || `LXP AI: ошибка ${res.status}`)
    // лимит бесплатного ключа Gemini: сколько секунд ждать до следующего запроса
    if (parsed?.code === 'rate_limit') {
      err.code = 'rate_limit'
      err.retryAfter = Number(parsed.retryAfter) || 60
    }
    throw err
  }
  const data = await res.json()
  return { text: ((data && data.text) || '').trim(), via: (data && data.via) || '' }
}

// Повторяет запрос раз в минуту, пока Render будит сервер. onRetry(attempt) — перед попыткой 2…CHAT_ATTEMPTS.
async function postWithRetry(path, payload, { signal, onRetry } = {}) {
  if (!PROXY) throw new Error(NO_PROXY)
  for (let attempt = 1; ; attempt++) {
    const started = Date.now()
    try {
      return await postOnce(path, payload, signal)
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

// Чат. model — id модели из getModels(); поиск по ответам сайта есть у всех моделей.
// web — разрешить поиск Google. Возвращает { text (markdown), via }.
export function chat({ messages, model = '', web = false, signal, onRetry }) {
  return postWithRetry('/api/chat', { messages, model, web: Boolean(web) }, { signal, onRetry })
}

// Отправляет код + инструкцию на прокси, получает переписанный код.
export async function refineCode({ code, lang, instruction, context, model = '' }) {
  const { text } = await postWithRetry('/api/refine', { code, lang, model, instruction: withContext(instruction, context) })
  return text.replace(/^```[^\n]*\n?/, '').replace(/\n?```\s*$/, '').trim()
}
