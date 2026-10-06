import { useState } from 'react'

export default function CodeBlock({ name, lang, code }) {
  const [copied, setCopied] = useState(false)
  const lines = code.replace(/\n$/, '').split('\n')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard may be unavailable; ignore
    }
  }

  return (
    <div className="code-block">
      <div className="code-head">
        <div className="code-file">
          <span className="code-dot" />
          <span className="code-name">{name}</span>
          {lang && <span className="code-lang">{lang}</span>}
        </div>
        <button className="code-copy" onClick={copy}>
          {copied ? '✓ Скопировано' : 'Копировать'}
        </button>
      </div>
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
