import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Attachment01Icon, BookOpen01Icon, Delete02Icon, Globe02Icon } from '@hugeicons/core-free-icons'
import { readyDisciplines } from '../lib/lessons.js'
import { CHAT_ATTEMPTS, chat, getModels, hasProxy, saveModel, savedModel } from '../lib/ai.js'
import AiIcon from './AiIcon.jsx'
import ChatMarkdown from './ChatMarkdown.jsx'
import ChatThinking, { thinkSteps } from './ChatThinking.jsx'
import Icon from './Icon.jsx'
import LimitNotice from './LimitNotice.jsx'
import PromptBar from './reactbits/PromptBar.jsx'
import StatusMark from './reactbits/StatusMark.jsx'

const HISTORY_KEY = 'lxp-chat'
const MAX_FILE = 100_000 // символов из одного прикреплённого файла

// Модели приходят с прокси — только те, у которых на сервере есть ключ. Пока список не пришёл
// (сервер просыпается), показываем заглушку, чтобы PromptBar было что отрисовать.
const NO_MODELS = [{ key: '', name: 'LXP AI', tag: 'загружаю модели…' }]
const WEB = 'Поиск в Google'

// команды раскрываются в просьбу для LXP AI; в чате видно то, что набрал пользователь
const COMMANDS = [
  { key: 'explain', name: '/объясни', description: 'Понятно и по шагам', prompt: 'Объясни понятно и по шагам:' },
  { key: 'solve', name: '/реши', description: 'Решение с проверкой', prompt: 'Реши задачу, распиши все шаги и проверь ответ:' },
  { key: 'check', name: '/проверь', description: 'Найти ошибки в решении или коде', prompt: 'Проверь решение (или код), найди ошибки и объясни, как исправить:' },
  { key: 'short', name: '/кратко', description: 'Коротко, только суть', prompt: 'Ответь коротко, только суть:' },
]

const SUGGESTIONS = [
  'Объясни, как найти обратную матрицу методом присоединённой матрицы',
  'Чем отличается класс от структуры в C#?',
  'Построй таблицу истинности для (A → B) ∧ ¬A',
  'Как сверстать шапку сайта на flexbox?',
]

function loadHistory() {
  try {
    const list = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
    // незавершённый ответ после перезагрузки считаем прерванным
    return Array.isArray(list) ? list.map((m) => (m.status === 'running' ? { ...m, status: 'cancelled' } : m)) : []
  } catch {
    return []
  }
}

function readText(file) {
  return new Promise((resolve) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result || ''))
    r.onerror = () => resolve('')
    r.readAsText(file)
  })
}

const STATUS_LABEL = {
  running: 'LXP AI думает…',
  done: 'Ответ готов',
  failed: 'Не получилось',
  cancelled: 'Остановлено',
}

export default function ChatView() {
  const [messages, setMessages] = useState(loadHistory)
  const [busy, setBusy] = useState(false)
  const [limit, setLimit] = useState(null) // { until, history, model, web, title } — модель упёрлась в лимит
  const [models, setModels] = useState(NO_MODELS)
  const files = useRef(new Map()) // имя прикреплённого файла → его текст
  const abortRef = useRef(null)
  const fileInput = useRef(null)
  const pickResolve = useRef(null)
  const endRef = useRef(null)
  const online = hasProxy()

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-60).map(({ fresh, attempt, ...m }) => m)))
    } catch {
      /* без хранилища история живёт до перезагрузки */
    }
  }, [messages])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [messages.length, busy])

  // пока ответ печатается — держим низ в поле зрения, если пользователь не прокрутил вверх
  const followTyping = useCallback(() => {
    const el = endRef.current
    if (!el) return
    if (el.getBoundingClientRect().top - window.innerHeight < 260) el.scrollIntoView({ block: 'end' })
  }, [])

  // сервер на Render мог уснуть — будим его сразу и заодно узнаём, какие модели подключены
  useEffect(() => {
    let alive = true
    getModels().then((list) => {
      if (alive && list.length) setModels(list.map((m) => ({ key: m.id, name: m.name, tag: m.tag })))
    })
    return () => {
      alive = false
    }
  }, [])
  // последняя выбранная модель — первой по умолчанию
  const defaultModel = models.some((m) => m.key === savedModel()) ? savedModel() : models[0].key
  const modelName = (id) => models.find((m) => m.key === id)?.name || ''

  useEffect(() => () => abortRef.current?.abort(), [])

  // закрыли диалог выбора файла без выбора — PromptBar не ждёт вечно
  useEffect(() => {
    const input = fileInput.current
    const onCancel = () => {
      pickResolve.current?.(null)
      pickResolve.current = null
    }
    input.addEventListener('cancel', onCancel)
    return () => input.removeEventListener('cancel', onCancel)
  }, [])

  const sources = useMemo(
    () => [
      { key: 'files', name: 'Файлы с компьютера', description: 'Код или текст задания', icon: Attachment01Icon, attach: true },
      { key: 'web', name: WEB, description: 'Свежая информация из интернета', icon: Globe02Icon },
      ...readyDisciplines.map((d) => ({
        key: d.id,
        name: d.name,
        description: `${d.answers.length} заданий на сайте`,
        icon: BookOpen01Icon,
      })),
    ],
    []
  )

  // «+» → «Файлы»: открываем системный диалог, PromptBar получает имена файлов
  const onAttach = useCallback(
    () =>
      new Promise((resolve) => {
        pickResolve.current = resolve
        fileInput.current.value = ''
        fileInput.current.click()
      }),
    []
  )
  const onFilesPicked = async (e) => {
    const picked = [...(e.target.files || [])]
    const names = []
    for (const f of picked) {
      files.current.set(f.name, (await readText(f)).slice(0, MAX_FILE))
      names.push(f.name)
    }
    pickResolve.current?.(names.length ? names : null)
    pickResolve.current = null
  }

  // то, что уходит в LXP AI: команда раскрыта, файлы и упомянутые дисциплины — в контексте
  const buildContent = (text, attachments) => {
    let body = text.replace(`@${WEB}`, '').replace(/\s{2,}/g, ' ').trim()
    const cmd = COMMANDS.find((c) => body === c.name || body.startsWith(c.name + ' '))
    if (cmd) body = `${cmd.prompt} ${body.slice(cmd.name.length).trim()}`.trim()

    const extra = []
    for (const d of readyDisciplines) {
      if (!text.includes(`@${d.name}`)) continue
      const titles = d.answers.map((a) => `— ${a.title}`).join('\n')
      extra.push(`Дисциплина «${d.name}»${d.teacher ? ` (преподаватель ${d.teacher})` : ''}. Темы заданий:\n${titles}`)
    }
    for (const name of attachments) {
      const content = files.current.get(name)
      if (content != null) extra.push(`Файл «${name}»:\n\`\`\`\n${content}\n\`\`\``)
    }
    return extra.length ? `${body}\n\n---\n${extra.join('\n\n')}` : body
  }

  const ask = async (history, model, web = false) => {
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setBusy(true)
    const startedAt = Date.now()
    setMessages((m) => [...m, { role: 'assistant', content: '', status: 'running', model, startedAt, steps: thinkSteps(model, web), via: web ? 'Gemini Flash' : modelName(model) }])
    const finish = (patch) =>
      setMessages((m) => m.map((x, i) => (i === m.length - 1 && x.status === 'running' ? { ...x, ...patch } : x)))
    try {
      const { text, via } = await chat({
        messages: history.filter((x) => x.status !== 'failed').map((x) => ({ role: x.role, content: x.api || x.content })),
        model,
        web,
        signal: ctrl.signal,
        onRetry: (attempt) => finish({ attempt }),
      })
      finish({
        content: text || 'Пустой ответ — попробуй переформулировать вопрос.',
        status: 'done',
        fresh: true,
        via,
        thinkMs: Date.now() - startedAt,
      })
    } catch (err) {
      if (ctrl.signal.aborted) finish({ status: 'cancelled' })
      else if (err.code === 'rate_limit') {
        finish({ content: `Не успел ответить: ${err.message.toLowerCase()}.`, status: 'failed' })
        setLimit({ until: Date.now() + err.retryAfter * 1000, history, model, web, title: err.message })
      } else finish({ content: err.message || String(err), status: 'failed' })
    } finally {
      if (abortRef.current === ctrl) abortRef.current = null
      setBusy(false)
    }
  }

  // повтор после лимита: убираем неудачный ответ и задаём тот же вопрос
  const retryAfterLimit = () => {
    if (!limit || busy) return
    const { history, model, web } = limit
    setLimit(null)
    setMessages((m) => (m.length && m[m.length - 1].status === 'failed' ? m.slice(0, -1) : m))
    ask(history, model, web)
  }

  const onSend = (text, { attachments = [], model }) => {
    if (busy) return
    setLimit(null)
    const shown = text || 'Посмотри прикреплённые файлы'
    const api = buildContent(shown, attachments)
    const userMsg = { role: 'user', content: shown, files: attachments, ...(api !== shown ? { api } : {}) }
    const history = [...messages.filter((x) => x.status !== 'cancelled' || x.content), userMsg]
    setMessages((m) => [...m, userMsg])
    const modelId = model?.key || defaultModel
    if (modelId) saveModel(modelId)
    ask(history, modelId, shown.includes(`@${WEB}`))
  }

  const onStop = () => abortRef.current?.abort()

  const clear = () => {
    abortRef.current?.abort()
    files.current.clear()
    setMessages([])
  }

  return (
    <section className="chat" aria-label="Чат с LXP AI">
      <header className="chat-head">
        <div className="chat-title">
          <span className="chat-logo">
            <AiIcon size={22} />
          </span>
          <div>
            <h1>LXP AI</h1>
            <p>Помощник по дисциплинам: объяснит тему, решит задачу, проверит код</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button type="button" className="btn" onClick={clear} title="Очистить историю чата">
            <Icon icon={Delete02Icon} size={15} />
            <span className="btn-text">Новый чат</span>
          </button>
        )}
      </header>

      {!online && (
        <p className="chat-offline" role="status">
          LXP AI не подключён к этому сайту: не задан адрес прокси (VITE_DEEPSEEK_PROXY). Сообщения отправятся с ошибкой.
        </p>
      )}

      <div className="chat-log" aria-live="polite">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <p>
              Спроси что угодно по учёбе. <kbd className="kbd">/</kbd> — команды, <kbd className="kbd">@</kbd> — дисциплина
              или файл с компьютера.
            </p>
            <div className="chat-suggest">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" className="chat-chip" disabled={busy} onClick={() => onSend(s, {})}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="chat-msg chat-msg--user">
                <p className="chat-text">{m.content}</p>
                {m.files?.length > 0 && (
                  <div className="chat-files">
                    {m.files.map((f) => (
                      <span key={f} className="chat-file">
                        <Icon icon={Attachment01Icon} size={12} />
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div key={i} className="chat-msg chat-msg--ai" data-status={m.status}>
                {(m.status === 'running' || (m.status === 'done' && m.thinkMs != null)) && m.steps ? (
                  <ChatThinking
                    working={m.status === 'running'}
                    steps={m.steps}
                    startedAt={m.startedAt}
                    elapsedMs={m.thinkMs}
                    wakeAttempt={m.attempt}
                    attempts={CHAT_ATTEMPTS}
                  />
                ) : (
                  <StatusMark
                    status={m.status}
                    label={STATUS_LABEL[m.status]}
                    color="var(--muted)"
                    doneColor="#8fd18a"
                    errorColor="#ff5c4d"
                    size={16}
                    fontSize={13}
                  />
                )}
                {m.content &&
                  (m.status === 'done' ? (
                    <ChatMarkdown
                      text={m.content}
                      animate={Boolean(m.fresh)}
                      onProgress={followTyping}
                      onDone={() => setMessages((list) => list.map((x, j) => (j === i ? { ...x, fresh: false } : x)))}
                    />
                  ) : (
                    <p className="chat-text">{m.content}</p>
                  ))}
                {m.status === 'done' && m.via && <span className="chat-via">{m.via}</span>}
              </div>
            )
          )
        )}
        <div ref={endRef} />
      </div>

      <div className="chat-input">
        {limit && (
          <LimitNotice title={limit.title} until={limit.until} onRetry={retryAfterLimit} onClose={() => setLimit(null)} />
        )}
        <PromptBar
          placeholder="Спроси LXP AI…  / — команды, @ — источники"
          sources={sources}
          commands={COMMANDS}
          key={models.map((m) => m.key).join()}
          models={models}
          defaultModel={defaultModel}
          efforts={[]}
          busy={busy}
          onSend={onSend}
          onStop={onStop}
          onAttach={onAttach}
          background="#171716"
          menuBackground="#1f1f1d"
          color="#edeae0"
          sparkColor="#ffd60a"
          width="100%"
          radius={18}
          maxRows={8}
        />
        <input ref={fileInput} type="file" multiple hidden onChange={onFilesPicked} />
      </div>
    </section>
  )
}
