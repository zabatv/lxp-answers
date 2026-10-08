import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity01Icon,
  Delete02Icon,
  FlashIcon,
  Key01Icon,
  RefreshIcon,
  ServerStack01Icon,
  ShieldKeyIcon,
} from '@hugeicons/core-free-icons'
import { adminCheck, adminClear, adminSetToken, adminStatus, hasProxy, ping } from '../lib/admin.js'
import { plural, readyDisciplines } from '../lib/lessons.js'
import Icon from './Icon.jsx'
import StatusMark from './reactbits/StatusMark.jsx'

const REFRESH_MS = 20_000

function uptime(sec) {
  if (sec < 60) return `${sec} с`
  const m = Math.floor(sec / 60)
  if (m < 60) return `${m} мин`
  const h = Math.floor(m / 60)
  return h < 24 ? `${h} ч ${m % 60} мин` : `${Math.floor(h / 24)} д ${h % 24} ч`
}
const timeOf = (iso) => new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
const KIND = { chat: 'Чат', refine: 'Правка кода', check: 'Проверка', token: 'Токен', admin: 'Вход' }

function Tile({ label, value, hint, tone }) {
  return (
    <div className="admin-tile" data-tone={tone}>
      <span className="admin-tile-label">{label}</span>
      <span className="admin-tile-value">{value}</span>
      {hint && <span className="admin-tile-hint">{hint}</span>}
    </div>
  )
}

// ---------- сайт: что готово, где КТ, что доделать (данные из src/data) ----------
function SiteOverview({ onSelect }) {
  const rows = useMemo(
    () =>
      readyDisciplines.map((d) => {
        const kt = d.answers.filter((a) => a.points != null)
        return {
          d,
          answers: d.answers.length,
          kt: kt.length,
          points: kt.reduce((s, a) => s + a.points, 0),
          notes: d.answers.filter((a) => a.note),
          unique: d.answers.filter((a) => a.unique || a.files.some((f) => f.unique)),
        }
      }),
    []
  )
  const todo = rows.flatMap((r) => r.notes.map((a) => ({ d: r.d, a })))
  const total = (k) => rows.reduce((s, r) => s + (Array.isArray(r[k]) ? r[k].length : r[k]), 0)

  return (
    <section className="admin-card">
      <h2 className="admin-h2">Сайт</h2>
      <div className="admin-tiles">
        <Tile label="Ответов" value={total('answers')} />
        <Tile label="Контрольных точек" value={total('kt')} hint={`${total('points')} баллов всего`} />
        <Tile label="Нужно доделать" value={todo.length} tone={todo.length ? 'warn' : undefined} />
        <Tile label="Со своими данными" value={total('unique')} />
      </div>
      <div className="admin-table">
        <table>
          <thead>
            <tr>
              <th>Дисциплина</th>
              <th>Ответов</th>
              <th>КТ</th>
              <th>Баллы КТ</th>
              <th>Доделать</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.d.id}>
                <td>
                  <button type="button" className="admin-link" onClick={() => onSelect(`${r.d.id}::${r.d.answers[0].id}`)}>
                    {r.d.name}
                  </button>
                </td>
                <td>{r.answers}</td>
                <td>{r.kt || '—'}</td>
                <td>{r.points || '—'}</td>
                <td>{r.notes.length || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {todo.length > 0 && (
        <>
          <h3 className="admin-h3">Нужно доделать руками</h3>
          <ul className="admin-todo">
            {todo.map(({ d, a }) => (
              <li key={`${d.id}::${a.id}`}>
                <button type="button" className="admin-link" onClick={() => onSelect(`${d.id}::${a.id}`)}>
                  {a.title}
                </button>
                <span>{a.note}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

// ---------- этот браузер: история чата и настройки ----------
function LocalTools() {
  const read = () => {
    try {
      const chat = JSON.parse(localStorage.getItem('lxp-chat') || '[]')
      return { chat: Array.isArray(chat) ? chat.length : 0, model: localStorage.getItem('deepseek_model') || 'по умолчанию' }
    } catch {
      return { chat: 0, model: '—' }
    }
  }
  const [info, setInfo] = useState(read)
  const run = (fn) => {
    try {
      fn()
    } catch {
      /* хранилище недоступно */
    }
    setInfo(read())
  }
  return (
    <section className="admin-card">
      <h2 className="admin-h2">Этот браузер</h2>
      <div className="admin-rows">
        <div className="admin-row">
          <span>
            История чата: {info.chat} {plural(info.chat, ['сообщение', 'сообщения', 'сообщений'])}
          </span>
          <button type="button" className="btn" disabled={!info.chat} onClick={() => run(() => localStorage.removeItem('lxp-chat'))}>
            <Icon icon={Delete02Icon} size={15} />
            <span className="btn-text">Очистить</span>
          </button>
        </div>
        <div className="admin-row">
          <span>Модель LXP AI у файлов: {info.model === 'deepseek-reasoner' ? 'Думающая' : 'обычная'}</span>
          <button type="button" className="btn" onClick={() => run(() => localStorage.removeItem('deepseek_model'))}>
            <Icon icon={RefreshIcon} size={15} />
            <span className="btn-text">Сбросить</span>
          </button>
        </div>
      </div>
    </section>
  )
}

// ---------- прокси: состояние, проверка, токен, журнал ----------
function ProxyPanel({ password, onLock }) {
  const [status, setStatus] = useState(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [check, setCheck] = useState(null) // {state, text}
  const [token, setToken] = useState('')
  const [tokenRes, setTokenRes] = useState(null) // {state, text}
  const [auto, setAuto] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setStatus(await adminStatus(password))
      setErr('')
    } catch (e) {
      if (e.status === 401 || e.status === 429) onLock(e.message)
      else setErr(e.message)
    } finally {
      setLoading(false)
    }
  }, [password, onLock])

  useEffect(() => {
    load()
  }, [load])
  useEffect(() => {
    if (!auto) return undefined
    const t = setInterval(load, REFRESH_MS)
    return () => clearInterval(t)
  }, [auto, load])

  const runCheck = async (model = 'deepseek-chat', name = 'DeepSeek') => {
    setCheck({ state: 'running', text: `${name}: проверяю и задаю тестовый вопрос…` })
    try {
      const r = await adminCheck(password, model)
      setCheck(
        r.ok
          ? { state: 'done', text: `${r.detail}. Ответ за ${(r.ms / 1000).toFixed(1)} с: «${r.answer}»` }
          : { state: 'failed', text: r.detail }
      )
    } catch (e) {
      setCheck({ state: 'failed', text: e.message })
    }
    load()
  }

  const saveToken = async (e) => {
    e.preventDefault()
    setTokenRes({ state: 'running', text: 'Проверяю новый токен у DeepSeek…' })
    try {
      const r = await adminSetToken(password, token)
      setToken('')
      setTokenRes({
        state: 'done',
        text: `Токен заменён (отпечаток ${r.token.hash}). ${r.persisted ? 'Сохранён в настройках Render.' : `Внимание: ${r.note}.`}`,
      })
    } catch (e2) {
      setTokenRes({ state: 'failed', text: e2.message })
    }
    load()
  }

  const clearStats = async () => {
    try {
      await adminClear(password)
    } catch (e) {
      setErr(e.message)
    }
    load()
  }

  const s = status?.stats
  const models = s ? Object.entries(s.models).sort((a, b) => b[1] - a[1]) : []
  const maxModel = models.length ? models[0][1] : 1

  return (
    <>
      <section className="admin-card">
        <div className="admin-card-head">
          <h2 className="admin-h2">
            <Icon icon={ServerStack01Icon} size={18} /> Прокси LXP AI
          </h2>
          <div className="admin-actions">
            <label className="admin-auto">
              <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
              автообновление
            </label>
            <button type="button" className="btn" onClick={load} disabled={loading}>
              <Icon icon={RefreshIcon} size={15} />
              <span className="btn-text">{loading ? 'Обновляю…' : 'Обновить'}</span>
            </button>
            <button type="button" className="btn" onClick={() => onLock('')}>
              <Icon icon={ShieldKeyIcon} size={15} />
              <span className="btn-text">Заблокировать</span>
            </button>
          </div>
        </div>
        {err && <p className="admin-error">{err}</p>}
        {status && (
          <div className="admin-tiles">
            <Tile label="Работает без перезапуска" value={uptime(status.uptime)} hint={`с ${timeOf(status.startedAt)}`} />
            <Tile
              label="Токен DeepSeek"
              value={status.token.set ? `${status.token.length} симв.` : 'не задан'}
              hint={status.token.set ? `отпечаток ${status.token.hash}` : undefined}
              tone={status.token.set ? undefined : 'bad'}
            />
            <Tile label="Запросов в чат" value={s.chat} hint={s.avgChatMs ? `в среднем ${(s.avgChatMs / 1000).toFixed(1)} с` : undefined} />
            <Tile label="Правок кода" value={s.refine} />
            <Tile label="Ошибок" value={s.errors} tone={s.errors ? 'bad' : undefined} />
            <Tile
              label="Смена токена"
              value={status.persist ? 'навсегда' : 'до перезапуска'}
              hint={status.persist ? 'через Render API' : 'нет RENDER_API_KEY'}
              tone={status.persist ? undefined : 'warn'}
            />
          </div>
        )}
        {models.length > 0 && (
          <div className="admin-models">
            {models.map(([m, n]) => (
              <div key={m} className="admin-model">
                <span>{m === 'deepseek-reasoner' ? 'LXP AI Думающая' : m === 'deepseek-chat' ? 'LXP AI' : m}</span>
                <span className="admin-bar">
                  <span style={{ width: `${(n / maxModel) * 100}%` }} />
                </span>
                <span>{n}</span>
              </div>
            ))}
          </div>
        )}
        {status?.providers && (
          <div className="admin-providers">
            <span className="admin-tile-label">
              Запасные модели {status.fallback ? '— подменяют DeepSeek, если он не ответил' : '(подмена выключена)'}
            </span>
            {status.providers.map((p) => (
              <div key={p.id} className="admin-provider" data-on={p.on ? '' : undefined}>
                <span className="admin-dot" data-ok={p.on ? '' : undefined} />
                <strong>{p.name}</strong>
                <span className="admin-provider-model">{p.model}</span>
                {p.on ? (
                  <button
                    type="button"
                    className="btn"
                    disabled={check?.state === 'running'}
                    onClick={() => runCheck(p.id, p.name)}
                  >
                    Проверить
                  </button>
                ) : (
                  <span className="admin-provider-off">нет ключа {p.id.toUpperCase()}_API_KEY</span>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="admin-row admin-row--check">
          <button type="button" className="btn btn-primary" onClick={() => runCheck()} disabled={check?.state === 'running'}>
            <Icon icon={FlashIcon} size={15} />
            Проверить DeepSeek
          </button>
          {check && <StatusMark status={check.state} label={check.text} color="var(--muted)" doneColor="#45e6b0" errorColor="#ff6b81" size={16} fontSize={13.5} />}
        </div>
      </section>

      <section className="admin-card">
        <h2 className="admin-h2">
          <Icon icon={Key01Icon} size={18} /> Токен DeepSeek
        </h2>
        <p className="admin-muted">
          На chat.deepseek.com нажми F12 → Console и выполни <code>JSON.parse(localStorage.userToken).value</code>, потом
          вставь результат сюда. Прокси сначала проверит токен у DeepSeek: если тот не подойдёт, останется старый.
        </p>
        <form className="admin-token" onSubmit={saveToken}>
          <input
            className="admin-input"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="Новый userToken"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={!token.trim() || tokenRes?.state === 'running'}>
            Заменить токен
          </button>
        </form>
        {tokenRes && (
          <StatusMark status={tokenRes.state} label={tokenRes.text} color="var(--muted)" doneColor="#45e6b0" errorColor="#ff6b81" size={16} fontSize={13.5} />
        )}
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <h2 className="admin-h2">
            <Icon icon={Activity01Icon} size={18} /> Журнал
          </h2>
          <button type="button" className="btn" onClick={clearStats}>
            <Icon icon={Delete02Icon} size={15} />
            <span className="btn-text">Сбросить статистику</span>
          </button>
        </div>
        {status?.events.length ? (
          <div className="admin-table">
            <table>
              <thead>
                <tr>
                  <th>Время</th>
                  <th>Что</th>
                  <th>Результат</th>
                  <th>Подробности</th>
                </tr>
              </thead>
              <tbody>
                {status.events.map((e, i) => (
                  <tr key={i} data-ok={e.ok ? '' : undefined}>
                    <td>{timeOf(e.t)}</td>
                    <td>{KIND[e.kind] || e.kind}</td>
                    <td>
                      <span className="admin-dot" data-ok={e.ok ? '' : undefined} />
                      {e.ok ? (e.ms ? `${(e.ms / 1000).toFixed(1)} с` : 'ок') : 'ошибка'}
                    </td>
                    <td className="admin-detail">{e.detail || (e.model ? e.model : '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="admin-muted">Пока пусто — журнал хранится в памяти сервера и обнуляется при перезапуске.</p>
        )}
      </section>
    </>
  )
}

export default function AdminView({ onSelect }) {
  const [password, setPassword] = useState('') // только в памяти вкладки
  const [draft, setDraft] = useState('')
  const [lockMsg, setLockMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [server, setServer] = useState(null) // открытая проверка GET /
  const online = hasProxy()
  const inputRef = useRef(null)

  useEffect(() => {
    if (!online) return
    ping()
      .then(setServer)
      .catch(() => setServer({ ok: false }))
  }, [online])

  const unlock = async (e) => {
    e.preventDefault()
    setBusy(true)
    setLockMsg('')
    try {
      await adminStatus(draft)
      setPassword(draft)
      setDraft('')
    } catch (err) {
      setLockMsg(err.message)
      inputRef.current?.focus()
    } finally {
      setBusy(false)
    }
  }

  const lock = useCallback((msg) => {
    setPassword('')
    setLockMsg(msg)
  }, [])

  return (
    <div className="admin">
      <header className="admin-head">
        <div>
          <h1>Админка</h1>
          <p>Состояние LXP AI, токен DeepSeek, журнал запросов и сводка по ответам</p>
        </div>
        {online && (
          <span className="admin-pill" data-state={server ? (server.ok ? 'ok' : 'bad') : 'wait'}>
            {server ? (server.ok ? `прокси на связи · ${server.ms} мс` : 'прокси не отвечает') : 'проверяю прокси…'}
          </span>
        )}
      </header>

      {!online ? (
        <section className="admin-card">
          <p className="admin-muted">Прокси не подключён к сайту (VITE_DEEPSEEK_PROXY), поэтому раздел сервера недоступен.</p>
        </section>
      ) : password ? (
        <ProxyPanel password={password} onLock={lock} />
      ) : (
        <section className="admin-card admin-lock">
          <h2 className="admin-h2">
            <Icon icon={ShieldKeyIcon} size={18} /> Управление сервером
          </h2>
          <p className="admin-muted">
            Пароль админки задаётся на Render в настройках <code>lxp-proxy</code> → Environment → <code>ADMIN_PASSWORD</code>.
            Он нигде не сохраняется и держится только до закрытия вкладки.
          </p>
          <form className="admin-token" onSubmit={unlock}>
            <input
              ref={inputRef}
              className="admin-input"
              type="password"
              autoComplete="current-password"
              placeholder="Пароль админки"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" disabled={!draft || busy}>
              {busy ? 'Проверяю…' : 'Открыть'}
            </button>
          </form>
          {lockMsg && <p className="admin-error">{lockMsg}</p>}
        </section>
      )}

      <SiteOverview onSelect={onSelect} />
      <LocalTools />
    </div>
  )
}
