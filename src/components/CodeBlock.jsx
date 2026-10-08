import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircleIcon,
  Copy01Icon,
  Download04Icon,
  PlayIcon,
  StopIcon,
  Tick02Icon,
  Undo02Icon,
  UserEdit01Icon,
} from '@hugeicons/core-free-icons'
import { refineCode } from '../lib/ai.js'
import { downloadFile } from '../lib/files.js'
import { highlight, langMeta } from '../lib/highlight.js'
import { buildPreview } from '../lib/preview.js'
import HtmlPreview from './HtmlPreview.jsx'
import Icon from './Icon.jsx'
import AiIcon from './AiIcon.jsx'
import ThoughtLine from './reactbits/ThoughtLine.jsx'

const THINK_STEPS = [
  'Читаю текущий код',
  'Разбираю задачу',
  'Подбираю изменения',
  'Переписываю код',
  'Проверяю синтаксис',
  'Финализирую ответ',
]

// code — текущий текст файла (с правками LXP AI), original — исходный из ответа.
// files — все файлы задания: HTML запускается вместе со своим style.css.
// unique — какие данные в решении уникальные (вариант, условие от преподавателя…);
// context — условие задания и пометки: уходят в LXP AI вместе с просьбой.
export default function CodeBlock({ name, lang, code, original, onChange, files, unique, context }) {
  const [copied, setCopied] = useState(false)
  const [panel, setPanel] = useState(false)
  const [running, setRunning] = useState(false)
  const [prompt, setPrompt] = useState('')
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
  // текстовые ответы (решения задач) — с переносом строк и без номеров
  const prose = lang === 'text'
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
      const out = await refineCode({ code, lang, instruction: prompt, context })
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
          {unique && (
            <span className="code-unique" title={unique}>
              свои данные
            </span>
          )}
          {changed && <span className="code-edited" title="Код изменён через LXP AI">изменён</span>}
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
            aria-label="Изменить ответ через LXP AI"
            title="Изменить ответ через LXP AI"
            onClick={() => setPanel((v) => !v)}
          >
            <AiIcon />
            <span className="btn-text">LXP AI</span>
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

      {unique && (
        <div className="unique-bar">
          <Icon icon={UserEdit01Icon} size={15} />
          <span>
            <strong>Свои данные:</strong> {unique}
          </span>
        </div>
      )}

      {panel && (
        <div className="ds-panel">
          <div className="ds-top">
            <span className="ds-title">
              <AiIcon />
              Что изменить в коде?
            </span>
          </div>
          <textarea
            className="textarea"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={onPromptKey}
            placeholder={
              unique
                ? 'Впиши свои данные, напр.: «мой вариант: …» — LXP AI пересчитает решение тем же методом'
                : 'Напр.: добавь комментарии; перепиши под .NET 6; упрости; найди ошибку'
            }
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
                label="LXP AI думает…"
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
        {!prose && (
          <pre className="code-gutter" aria-hidden="true">
            {Array.from({ length: lineCount }, (_, i) => (
              <span key={i}>{i + 1}</span>
            ))}
          </pre>
        )}
        <pre className={`code-pre${prose ? ' code-pre--prose' : ''}`}>
          <code dangerouslySetInnerHTML={{ __html: html }} />
        </pre>
      </div>
    </div>
  )
}
