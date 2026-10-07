import { useEffect, useMemo, useRef } from 'react'
import { Cancel01Icon, Search01Icon } from '@hugeicons/core-free-icons'
import { disciplines } from '../data/disciplines.js'
import {
  lessons,
  menuLabels,
  plural,
  queryWords,
  readyDisciplines,
  searchLessons,
  soonDisciplines,
} from '../lib/lessons.js'
import Icon from './Icon.jsx'
import Logo from './Logo.jsx'
import BranchedMenu from './reactbits/BranchedMenu.jsx'
import GradientText from './reactbits/GradientText.jsx'
import ShinyText from './reactbits/ShinyText.jsx'

const BRAND_GRADIENT = ['#8b7bff', '#4cc9f0', '#45e6b0', '#4cc9f0', '#8b7bff']

export function Brand({ compact = false }) {
  return (
    <div className={`brand${compact ? ' brand--compact' : ''}`}>
      <Logo className="brand-mark" size={compact ? 30 : 38} />
      <div className="brand-text">
        <div className="brand-name">
          <GradientText colors={BRAND_GRADIENT} animationSpeed={8}>LXP</GradientText> Ответы
        </div>
        {!compact && <ShinyText className="brand-sub" text="IThub · 2ИТП1.9.25" speed={5} />}
      </div>
    </div>
  )
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// подсвечивает найденные слова в названии
function Marked({ text, words }) {
  if (!words.length) return text
  const re = new RegExp(`(${words.map(escapeRe).join('|')})`, 'gi')
  return text.split(re).map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part))
}

const withTeacher = (d) => (d.teacher ? `${d.name} · ${d.teacher}` : d.name)

// метки задания в списке: КТ (на баллы) и «нужно доделать»
function Marks({ a }) {
  if (a.points == null && !a.note) return null
  return (
    <>
      {a.note && (
        <span className="bm-todo" title={`Нужно доделать: ${a.note}`}>
          !
        </span>
      )}
      {a.points != null && (
        <span className="bm-kt" title={`Контрольная точка — ${a.points} ${plural(a.points, ['балл', 'балла', 'баллов'])}`}>
          КТ {a.points}
        </span>
      )}
    </>
  )
}

export default function Sidebar({ selected, onSelect, query, onQuery, searchRef, open, onClose }) {
  const scrollRef = useRef(null)

  const readyItems = useMemo(
    () =>
      readyDisciplines.map((d) => {
        const labels = menuLabels(d.answers)
        // если в дисциплине есть номера, ненумерованные пункты выравниваем точкой
        const numbered = labels.some((l) => l.num)
        return {
          label: d.name,
          title: withTeacher(d),
          meta: d.answers.length,
          children: d.answers.map((a, i) => ({
            value: `${d.id}::${a.id}`,
            title: a.title,
            label: (
              <>
                {numbered && <span className="bm-num">{labels[i].num || '·'}</span>}
                {labels[i].text}
              </>
            ),
            meta: a.points != null || a.note ? <Marks a={a} /> : null,
          })),
        }
      }),
    []
  )
  const soonItems = useMemo(() => soonDisciplines.map((d) => ({ value: d.id, label: d.name, title: withTeacher(d) })), [])
  const openIndex = Math.max(0, readyDisciplines.findIndex((d) => selected.startsWith(`${d.id}::`)))

  const searching = query.trim().length > 0
  const results = useMemo(() => searchLessons(query), [query])
  const words = useMemo(() => queryWords(query), [query])

  // держим выбранный пункт в поле зрения (после раскрытия раздела — 300 мс)
  useEffect(() => {
    if (searching) return undefined
    const t = setTimeout(() => {
      const box = scrollRef.current
      const el = box && box.querySelector('[aria-current="true"]')
      if (!el) return
      const b = box.getBoundingClientRect()
      const r = el.getBoundingClientRect()
      if (r.top < b.top + 8) box.scrollBy({ top: r.top - b.top - 56, behavior: 'smooth' })
      else if (r.bottom > b.bottom - 8) box.scrollBy({ top: r.bottom - b.bottom + 56, behavior: 'smooth' })
    }, 340)
    return () => clearTimeout(t)
  }, [selected, searching])

  const onSearchKey = (e) => {
    if (e.key === 'Enter' && results[0]) onSelect(results[0].value)
    if (e.key === 'Escape') {
      if (query) {
        e.stopPropagation()
        onQuery('')
      } else {
        e.currentTarget.blur()
      }
    }
  }

  const pct = Math.round((readyDisciplines.length / disciplines.length) * 100)

  return (
    <aside className="sidebar" data-open={open ? '' : undefined} aria-label="Дисциплины и задания">
      <div className="side-top">
        <div className="side-brand-row">
          <Brand />
          <button type="button" className="icon-btn side-close" onClick={onClose} aria-label="Закрыть меню">
            <Icon icon={Cancel01Icon} size={18} />
          </button>
        </div>

        <label className="search">
          <Icon icon={Search01Icon} size={16} />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            onKeyDown={onSearchKey}
            placeholder="Найти задание…"
            aria-label="Поиск по заданиям"
            autoComplete="off"
            spellCheck={false}
          />
          {query ? (
            <button type="button" className="search-clear" onClick={() => onQuery('')} aria-label="Очистить поиск">
              <Icon icon={Cancel01Icon} size={14} />
            </button>
          ) : (
            <kbd className="kbd" title="Нажми / для поиска">/</kbd>
          )}
        </label>
      </div>

      <div className="side-scroll" ref={scrollRef}>
        {searching ? (
          <div className="results">
            <div className="side-label">
              <span>Найдено</span>
              <span>{results.length}</span>
            </div>
            {results.length ? (
              results.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  className="result"
                  data-active={l.value === selected ? '' : undefined}
                  onClick={() => onSelect(l.value)}
                >
                  <span className="result-disc">
                    {l.d.name}
                    <Marks a={l.a} />
                  </span>
                  <span className="result-title">
                    <Marked text={l.a.title} words={words} />
                  </span>
                </button>
              ))
            ) : (
              <p className="results-empty">
                Ничего не нашлось.
                <br />
                Попробуй другое слово.
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="side-label">
              <span>Дисциплины</span>
              <span>{readyDisciplines.length}</span>
            </div>
            <BranchedMenu
              items={readyItems}
              defaultOpen={openIndex}
              active={selected}
              onSelect={onSelect}
              color="var(--fg)"
              accentColor="var(--accent)"
              lineColor="rgba(255, 255, 255, 0.1)"
              width={400}
              indent={30}
              rowHeight={34}
              fontSize={13.5}
            />

            <div className="side-label side-label--soon">
              <span>Скоро</span>
              <span>{soonDisciplines.length}</span>
            </div>
            <BranchedMenu
              className="branched-menu--soon"
              items={soonItems}
              defaultOpen={-1}
              active={selected}
              onSelect={onSelect}
              color="var(--fg)"
              accentColor="var(--accent)"
              lineColor="rgba(255, 255, 255, 0.06)"
              width={400}
              fontSize={13}
            />
          </>
        )}
      </div>

      <div className="side-foot">
        <div className="progress-meta">
          <span>
            Готово {readyDisciplines.length} из {disciplines.length}{' '}
            {plural(disciplines.length, ['дисциплины', 'дисциплин', 'дисциплин'])}
          </span>
          <span className="progress-num">
            {lessons.length} {plural(lessons.length, ['ответ', 'ответа', 'ответов'])}
          </span>
        </div>
        <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${pct}%` }} />
        </div>
      </div>
    </aside>
  )
}
