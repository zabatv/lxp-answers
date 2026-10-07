import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircleIcon,
  Copy01Icon,
  Download04Icon,
  PlayIcon,
  StopIcon,
  Tick02Icon,
  Undo02Icon,
} from '@hugeicons/core-free-icons'
import { getModel, setModel, refineCode, DEFAULT_MODEL } from '../lib/deepseek.js'
import { downloadFile } from '../lib/files.js'
import { highlight, langMeta } from '../lib/highlight.js'
import { buildPreview } from '../lib/preview.js'
import HtmlPreview from './HtmlPreview.jsx'
import Icon from './Icon.jsx'
import ThoughtLine from './reactbits/ThoughtLine.jsx'

const THINK_STEPS = [
  'Читаю текущий код',
  'Разбираю задачу',
  'Подбираю изменения',
  'Переписываю код',
  'Проверяю синтаксис',
  'Финализирую ответ',
]

function DeepSeekIcon() {
  // стилизованный «кит» DeepSeek
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 13c3 0 4-2 7-2 2.5 0 4 1.5 6.5 1.5 1.6 0 2.7-.6 3.5-1.5-.3 3.5-3.2 6-7.5 6-4 0-6.7-1.8-9.5-4z"
        fill="#4D6BFE"
      />
      <circle cx="16.5" cy="10.5" r="1.1" fill="#fff" />
      <path d="M11 8c1.5-2 4-2.5 6-1.5" stroke="#4D6BFE" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

// code — текущий текст файла (с правками DeepSeek), original — исходный из ответа.
// files — все файлы задания: HTML запускается вместе со своим style.css.
export default function CodeBlock({ name, lang, code, original, onChange, files }) {
  const [copied, setCopied] = useState(false)
  const [panel, setPanel] = useState(false)
  const [running, setRunning] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [model, setModelState] = useState(getModel())
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [steps, setSteps] = useState([])
  const stepTimer = useRef(null)
  const copyTimer = useRef(null)

  useEffect(() => () => {
    clearInterval(stepTimer.current)
    clearTimeout(copyTimer.current)
  }, [])

  const changed = code !== original
  const runnable = lang === 'html'
  const text = code.replace(/\n$/, '')
  const lineCount = text.split('\n').length
  const html = useMemo(() => highlight(text, lang), [text, lang])
  const previewDoc = useMemo(
    () => (runnable && running ? buildPreview(code, files || []) : ''),
    [runnable, running, code, files]
  )
  const meta = langMeta(lang)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopied(false), 1600)
    } catch { /* clipboard недоступен */ }
  }

  const apply = async () => {
    setErr('')
    if (!prompt.trim()) { setErr('Опишите, что изменить'); return }
    setModel(model)
    setBusy(true)
    setSteps([THINK_STEPS[0]])
    let idx = 1
    stepTimer.current = setInterval(() => {
      if (idx < THINK_STEPS.length) {
        setSteps(THINK_STEPS.slice(0, idx + 1))
        idx += 1
      } else {
        clearInterval(stepTimer.current)
      }
    }, Math.floor(2000 / THINK_STEPS.length))
    try {
      const out = await refineCode({ code, lang, instruction: prompt, model })
      if (out) onChange(out)
      setPrompt('')
      setPanel(false)
    } catch (e) {
      setErr(e.message || 'Ошибка запроса')
    } finally {
      clearInterval(stepTimer.current)
      setBusy(false)
      setSteps([])
    }
  }

  const onPromptKey = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      if (!busy) apply()
    }
  }

  return (
    <div className="code-block">
      <div className="code-head">
        <div className="code-file">
          <span className="lang-badge" style={{ '--lang': meta.color }}>{meta.label}</span>
          <span className="code-name" title={name}>{name}</span>
          {changed && <span className="code-edited" title="Код изменён через DeepSeek">изменён</span>}
        </div>
        <div className="code-actions">
          {runnable && (
            <button
              type="button"
              className="btn btn-run"
              aria-pressed={running}
              aria-label={running ? 'Остановить' : 'Запустить HTML'}
              title={running ? 'Скрыть результат' : 'Запустить HTML прямо здесь'}
              onClick={() => setRunning((v) => !v)}
            >
              <Icon icon={running ? StopIcon : PlayIcon} size={15} />
              <span className="btn-text">{running ? 'Остановить' : 'Запустить'}</span>
            </button>
          )}
          <button
            type="button"
            className="btn btn-ds"
            aria-expanded={panel}
            aria-label="Изменить ответ через DeepSeek"
            title="Изменить ответ через DeepSeek"
            onClick={() => setPanel((v) => !v)}
          >
            <DeepSeekIcon />
            <span className="btn-text">DeepSeek</span>
          </button>
          {changed && (
            <button
              type="button"
              className="btn"
              aria-label="Вернуть исходный код"
              title="Вернуть исходный код"
              onClick={() => onChange(original)}
            >
              <Icon icon={Undo02Icon} size={15} />
              <span className="btn-text">Оригинал</span>
            </button>
          )}
          <button
            type="button"
            className="btn"
            aria-label={`Скачать ${name}`}
            title={`Скачать ${name}`}
            onClick={() => downloadFile(name, code)}
          >
            <Icon icon={Download04Icon} size={15} />
            <span className="btn-text">Скачать</span>
          </button>
          <button
            type="button"
            className="btn"
            data-copied={copied ? '' : undefined}
            aria-label={copied ? 'Скопировано' : 'Скопировать код'}
            title="Скопировать код"
            onClick={copy}
          >
            <Icon icon={copied ? Tick02Icon : Copy01Icon} size={15} />
            <span className="btn-text">{copied ? 'Скопировано' : 'Копировать'}</span>
          </button>
        </div>
      </div>

      {panel && (
        <div className="ds-panel">
          <div className="ds-top">
            <span className="ds-title">
              <DeepSeekIcon />
              Что изменить в коде?
            </span>
            <label className="ds-model">
              <span>Модель</span>
              <select className="select" value={model} onChange={(e) => setModelState(e.target.value)}>
                <option value={DEFAULT_MODEL}>deepseek-chat</option>
                <option value="deepseek-reasoner">deepseek-reasoner</option>
              </select>
            </label>
          </div>
          <textarea
            className="textarea"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={onPromptKey}
            placeholder="Напр.: добавь комментарии; перепиши под .NET 6; упрости; найди ошибку"
            rows={3}
            autoFocus
          />
          {err && (
            <div className="ds-err">
              <Icon icon={AlertCircleIcon} size={15} />
              <span>{err}</span>
            </div>
          )}
          {busy && (
            <div className="ds-thinking">
              <ThoughtLine
                label="DeepSeek думает…"
                doneLabel="Готово за"
                steps={steps}
                working
                collapsible
                color="var(--fg)"
                glyphColor="#8fa2ff"
                fontSize={14}
              />
            </div>
          )}
          <div className="ds-row">
            <button type="button" className="btn btn-primary" onClick={apply} disabled={busy}>
              {busy ? 'Думаю…' : 'Применить'}
            </button>
            <button type="button" className="btn" onClick={() => setPanel(false)} disabled={busy}>
              Отмена
            </button>
            <span className="ds-hint">
              <kbd className="kbd">Ctrl</kbd> + <kbd className="kbd">Enter</kbd>
            </span>
          </div>
        </div>
      )}

      {running && <HtmlPreview doc={previewDoc} name={name} />}

      <div className="code-body">
        <pre className="code-gutter" aria-hidden="true">
          {Array.from({ length: lineCount }, (_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </pre>
        <pre className="code-pre">
          <code dangerouslySetInnerHTML={{ __html: html }} />
        </pre>
      </div>
    </div>
  )
}
