import { useState } from 'react'
import { getKey, getModel, setModel, refineCode, DEFAULT_MODEL } from '../lib/deepseek.js'
import LatticeLoader from './reactbits/LatticeLoader.jsx'

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

export default function CodeBlock({ name, lang, code }) {
  const [current, setCurrent] = useState(code)
  const [copied, setCopied] = useState(false)
  const [panel, setPanel] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [model, setModelState] = useState(getModel())
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const changed = current !== code
  const lines = current.replace(/\n$/, '').split('\n')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(current)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard недоступен */ }
  }

  const apply = async () => {
    setErr('')
    const k = getKey()
    if (!k) { setErr('Ключ DeepSeek не настроен на сайте'); return }
    if (!prompt.trim()) { setErr('Опишите, что изменить'); return }
    setModel(model)
    setBusy(true)
    try {
      const out = await refineCode({ code: current, lang, instruction: prompt, key: k, model })
      if (out) setCurrent(out)
      setPrompt('')
      setPanel(false)
    } catch (e) {
      setErr(e.message || 'Ошибка запроса')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="code-block">
      <div className="code-head">
        <div className="code-file">
          <span className="code-dot" />
          <span className="code-name">{name}</span>
          {lang && <span className="code-lang">{lang}</span>}
          {changed && <span className="code-edited" title="Код изменён через DeepSeek">● DeepSeek</span>}
        </div>
        <div className="code-actions">
          <button className="code-ds" onClick={() => setPanel((v) => !v)} title="Изменить ответ через DeepSeek">
            <DeepSeekIcon />
            DeepSeek
          </button>
          {changed && (
            <button className="code-copy" onClick={() => setCurrent(code)} title="Вернуть исходный код">
              Оригинал
            </button>
          )}
          <button className="code-copy" onClick={copy}>
            {copied ? '✓ Скопировано' : 'Копировать'}
          </button>
        </div>
      </div>

      {panel && (
        <div className="ds-panel">
          <div className="ds-field">
            <span className="ds-hint">Модель DeepSeek</span>
            <select className="ds-select" value={model} onChange={(e) => setModelState(e.target.value)}>
              <option value={DEFAULT_MODEL}>deepseek-chat</option>
              <option value="deepseek-reasoner">deepseek-reasoner</option>
            </select>
          </div>
          <textarea
            className="ds-textarea"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Что изменить в коде? Напр.: добавь комментарии; перепиши под .NET 6; упрости; найди ошибку"
            rows={3}
          />
          {err && <div className="ds-err">{err}</div>}
          <div className="ds-row">
            <button className="ds-apply" onClick={apply} disabled={busy}>
              {busy ? (
                <LatticeLoader label="DeepSeek" status="working" color="#fff" glow glowColor="#bcd0ff" />
              ) : (
                'Применить'
              )}
            </button>
            <button className="ds-cancel" onClick={() => setPanel(false)}>Отмена</button>
          </div>
        </div>
      )}

      <div className="code-body">
        <pre className="code-gutter" aria-hidden="true">
          {lines.map((_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </pre>
        <pre className="code-pre">
          <code>{lines.join('\n')}</code>
        </pre>
      </div>
    </div>
  )
}
