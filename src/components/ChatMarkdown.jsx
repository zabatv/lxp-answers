import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { Copy01Icon, Tick02Icon } from '@hugeicons/core-free-icons'
import { highlight } from '../lib/highlight.js'
import Icon from './Icon.jsx'

// Ответ LXP AI: Markdown (таблицы, списки, формулы KaTeX, код с подсветкой) и «печатание»
// в духе ReactBits ScrollReveal — слова проявляются из размытия, блок ответа доворачивается.

const LANG_ALIAS = { 'c#': 'csharp', cs: 'csharp', htm: 'html', js: 'javascript', jsx: 'javascript', ts: 'javascript' }

// DeepSeek пишет формулы как \( … \) и \[ … \] — remark-math понимает только $ и $$
function normalizeMath(text) {
  return text
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, m) => `\n$$\n${m.trim()}\n$$\n`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, m) => `$${m.trim()}$`)
}

const hasClass = (node, part) =>
  [].concat(node.properties?.className || []).some((c) => String(c).includes(part))
const addClass = (node, cls) => {
  node.properties = node.properties || {}
  node.properties.className = [].concat(node.properties.className || [], cls)
}

// rehype-плагин: каждое слово — <span class="tw">, формулы и код проявляются целиком
function rehypeWords() {
  const walk = (node, inPre) => {
    if (!node.children) return
    const out = []
    for (const child of node.children) {
      if (child.type === 'text' && !inPre) {
        for (const part of child.value.split(/(\s+)/)) {
          if (!part) continue
          if (/^\s+$/.test(part)) out.push({ type: 'text', value: part })
          else out.push({ type: 'element', tagName: 'span', properties: { className: ['tw'] }, children: [{ type: 'text', value: part }] })
        }
        continue
      }
      if (child.type === 'element') {
        if (hasClass(child, 'katex') || (child.tagName === 'code' && !inPre)) addClass(child, 'tw')
        else walk(child, inPre || child.tagName === 'pre')
      }
      out.push(child)
    }
    node.children = out
  }
  return (tree) => walk(tree, false)
}

function textOf(node) {
  if (!node) return ''
  if (node.type === 'text') return node.value
  return (node.children || []).map(textOf).join('')
}

function CodeBlock({ node }) {
  const [copied, setCopied] = useState(false)
  const codeEl = node?.children?.find((c) => c.tagName === 'code')
  const cls = [].concat(codeEl?.properties?.className || []).find((c) => String(c).startsWith('language-'))
  const raw = cls ? String(cls).slice(9).toLowerCase() : ''
  const lang = LANG_ALIAS[raw] || raw
  const code = textOf(codeEl).replace(/\n$/, '')
  const html = useMemo(() => highlight(code, lang), [code, lang])
  const copy = () => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    })
  }
  return (
    <div className="chat-code tw">
      <div className="chat-code-head">
        <span>{raw || 'код'}</span>
        <button type="button" className="chat-code-copy" onClick={copy} aria-label="Скопировать код">
          <Icon icon={copied ? Tick02Icon : Copy01Icon} size={14} />
          {copied ? 'Скопировано' : 'Копировать'}
        </button>
      </div>
      <pre className="code-pre">
        <code className="hljs" dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  )
}

const COMPONENTS = {
  pre: CodeBlock,
  // ссылки на задания сайта (#/math/hm_final) открываются здесь же, остальные — в новой вкладке
  a: ({ node, href = '', ...props }) =>
    href.startsWith('#/') ? (
      <a {...props} href={href} className="chat-site-link" />
    ) : (
      <a {...props} href={href} target="_blank" rel="noreferrer noopener" />
    ),
  table: ({ node, ...props }) => (
    <div className="chat-table">
      <table {...props} />
    </div>
  ),
}
const REMARK = [remarkGfm, remarkMath]
const REHYPE = [[rehypeKatex, { throwOnError: false, strict: false }], rehypeWords]

// где можно оборвать текст: по границе слова и не внутри ``` или $$ (их показываем целиком)
function cutAt(text, n) {
  if (n >= text.length) return text.length
  let end = text.slice(n).search(/\s/)
  end = end < 0 ? text.length : n + end
  for (const fence of ['```', '$$']) {
    const opened = text.slice(0, end).split(fence).length - 1
    if (opened % 2) {
      const close = text.indexOf(fence, text.lastIndexOf(fence, end - 1) + fence.length)
      end = close < 0 ? text.length : close + fence.length
    }
  }
  return end
}

export default function ChatMarkdown({ text, animate = false, onDone, onProgress }) {
  const source = useMemo(() => normalizeMath(text), [text])
  const [n, setN] = useState(animate ? 0 : source.length)
  const done = n >= source.length
  const cb = useRef({ onDone, onProgress })
  cb.current = { onDone, onProgress }

  useEffect(() => {
    if (done) {
      if (animate) cb.current.onDone?.()
      return undefined
    }
    // ~3 с на длинный ответ, но не медленнее нескольких символов за кадр
    const step = Math.max(3, Math.ceil(source.length / 110))
    const t = setTimeout(() => {
      setN((v) => cutAt(source, v + step))
      cb.current.onProgress?.()
    }, 28)
    return () => clearTimeout(t)
  }, [n, done, animate, source])

  const shown = done ? source : source.slice(0, n)
  return (
    <div
      className="chat-md"
      data-typing={done ? undefined : ''}
      data-anim={animate ? '' : undefined}
      onClick={done ? undefined : () => setN(source.length)}
      title={done ? undefined : 'Нажми, чтобы показать сразу'}
    >
      <ReactMarkdown remarkPlugins={REMARK} rehypePlugins={REHYPE} components={COMPONENTS}>
        {shown}
      </ReactMarkdown>
    </div>
  )
}
