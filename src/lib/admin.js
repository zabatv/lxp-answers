// Запросы админки к прокси. Пароль админки живёт только в памяти вкладки и уходит
// в теле запроса по HTTPS; проверяет его прокси (переменная ADMIN_PASSWORD на Render).
import { hasProxy, proxyBase } from './ai.js'

export { hasProxy }

async function post(action, body) {
  let res
  try {
    res = await fetch(`${proxyBase()}/api/admin/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error('Нет связи с прокси — он мог уснуть. Подожди минуту и нажми «Обновить».')
  }
  let data = null
  try { data = await res.json() } catch { /* не JSON — Render ещё будит сервер */ }
  if (!res.ok || !data) {
    const err = new Error((data && data.error) || `Прокси ответил ${res.status} — возможно, ещё просыпается`)
    err.status = res.status
    throw err
  }
  return data
}

export const adminStatus = (password) => post('status', { password })
export const adminCheck = (password, model) => post('check', { password, model })
export const adminClear = (password) => post('clear', { password })

// GET / — открытая проверка: жив ли сервер и сколько он отвечает
export async function ping() {
  const t0 = performance.now()
  const res = await fetch(`${proxyBase()}/`, { cache: 'no-store' })
  const data = await res.json()
  return { ...data, ms: Math.round(performance.now() - t0) }
}
