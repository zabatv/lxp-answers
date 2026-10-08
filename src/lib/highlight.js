// Подсветка синтаксиса (highlight.js core — только нужные языки, чтобы не раздувать сборку).
import hljs from 'highlight.js/lib/core'
import xml from 'highlight.js/lib/languages/xml'
import csharp from 'highlight.js/lib/languages/csharp'
import css from 'highlight.js/lib/languages/css'
import sql from 'highlight.js/lib/languages/sql'
import javascript from 'highlight.js/lib/languages/javascript'
import python from 'highlight.js/lib/languages/python'

hljs.registerLanguage('xml', xml)
hljs.registerLanguage('csharp', csharp)
hljs.registerLanguage('css', css)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('python', python)

// lang из data/*.js → грамматика highlight.js
const GRAMMAR = {
  xml: 'xml',
  xsd: 'xml',
  xslt: 'xml',
  dtd: 'xml',
  html: 'xml',
  csharp: 'csharp',
  css: 'css',
  sql: 'sql',
  js: 'javascript',
  javascript: 'javascript',
  python: 'python',
  py: 'python',
}

// подпись и цвет бейджа языка у файла
const META = {
  csharp: { label: 'C#', color: '#b79cff' },
  html: { label: 'HTML', color: '#ff8a65' },
  css: { label: 'CSS', color: '#6cc7ff' },
  xml: { label: 'XML', color: '#ffab70' },
  xsd: { label: 'XSD', color: '#ffcb6b' },
  xslt: { label: 'XSLT', color: '#ff8fa3' },
  dtd: { label: 'DTD', color: '#c3a6ff' },
  sql: { label: 'SQL', color: '#45e6b0' },
  js: { label: 'JS', color: '#f7df6b' },
  javascript: { label: 'JS', color: '#f7df6b' },
  python: { label: 'PY', color: '#7fd1c7' },
  text: { label: 'TXT', color: '#a3a6bd' },
}

export function langMeta(lang) {
  return META[lang] || { label: (lang || 'txt').toUpperCase(), color: '#a3a6bd' }
}

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Возвращает безопасный HTML: highlight.js сам экранирует исходный код.
export function highlight(code, lang) {
  const grammar = GRAMMAR[lang]
  if (!grammar) return escapeHtml(code)
  try {
    return hljs.highlight(code, { language: grammar, ignoreIllegals: true }).value
  } catch {
    return escapeHtml(code)
  }
}
