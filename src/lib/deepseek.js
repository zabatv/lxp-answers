// Механика DeepSeek (как в collablab: ключ задаётся отдельно, модель DeepSeek).
// Здесь — прямой вызов OpenAI-совместимого HTTP API DeepSeek из браузера.
// Ключ хранится только в localStorage этого браузера и никуда не коммитится.

const KEY_STORAGE = 'deepseek_api_key'
const MODEL_STORAGE = 'deepseek_model'
export const DEFAULT_MODEL = 'deepseek-chat' // 'deepseek-reasoner' — модель с рассуждением

// Ключ из переменной окружения сборки (Render → Environment → VITE_DEEPSEEK_API_KEY).
// ВНИМАНИЕ: на статическом сайте такой ключ попадает в публичный бандл и виден всем.
const ENV_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_DEEPSEEK_API_KEY) || ''

export function hasEnvKey() {
  return Boolean(ENV_KEY)
}

export function getKey() {
  try { return localStorage.getItem(KEY_STORAGE) || ENV_KEY } catch { return ENV_KEY }
}
export function setKey(k) {
  try { localStorage.setItem(KEY_STORAGE, k) } catch { /* приватный режим */ }
}
export function getModel() {
  try { return localStorage.getItem(MODEL_STORAGE) || DEFAULT_MODEL } catch { return DEFAULT_MODEL }
}
export function setModel(m) {
  try { localStorage.setItem(MODEL_STORAGE, m) } catch { /* приватный режим */ }
}

// Отправляет текущий код + инструкцию в DeepSeek, возвращает переписанный код.
export async function refineCode({ code, lang, instruction, key, model }) {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + key,
    },
    body: JSON.stringify({
      model: model || getModel(),
      temperature: 0.2,
      stream: false,
      messages: [
        {
          role: 'system',
          content:
            'Ты — ассистент, который правит код по просьбе пользователя. ' +
            'Верни ТОЛЬКО итоговый код на языке ' + (lang || 'text') +
            ', без markdown-ограждений и без пояснений.',
        },
        {
          role: 'user',
          content: 'Вот код:\n\n' + code + '\n\nЗадача: ' + instruction,
        },
      ],
    }),
  })

  if (!res.ok) {
    let detail = ''
    try { detail = await res.text() } catch { /* ignore */ }
    throw new Error('DeepSeek ' + res.status + (detail ? ': ' + detail.slice(0, 200) : ''))
  }

  const data = await res.json()
  let out = (data && data.choices && data.choices[0] && data.choices[0].message &&
             data.choices[0].message.content) || ''
  // убираем markdown-ограждения ```lang ... ```
  out = out.replace(/^```[^\n]*\n?/, '').replace(/\n?```\s*$/, '').trim()
  return out
}
