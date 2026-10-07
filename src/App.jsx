import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Menu01Icon, Search01Icon } from '@hugeicons/core-free-icons'
import {
  DEFAULT_VALUE,
  findDiscipline,
  findLesson,
  hashFromValue,
  lessons,
  menuLabel,
  valueFromHash,
} from './lib/lessons.js'
import ShinyText from './components/reactbits/ShinyText.jsx'
import Sidebar, { Brand } from './components/Sidebar.jsx'
import LessonView from './components/LessonView.jsx'
import SoonView from './components/SoonView.jsx'
import Icon from './components/Icon.jsx'

// three.js тяжёлый — фон грузится отдельным чанком, контент показывается сразу
const Antigravity = lazy(() => import('./components/reactbits/Antigravity.jsx'))

const PARTICLE_COLORS = ['#8b7bff', '#a99bff', '#5b8cff', '#4cc9f0', '#45e6b0']
// на узком экране частиц меньше и кольцо уже — иначе они закрывают текст
const PARTICLES = {
  wide: { count: 260, ringRadius: 9, magnetRadius: 11 },
  compact: { count: 90, ringRadius: 5, magnetRadius: 6.5 },
}
const COMPACT = '(max-width: 960px)'

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const update = () => setMatches(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [query])
  return matches
}

const isTyping = (el) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))

export default function App() {
  const [selected, setSelected] = useState(() => valueFromHash(window.location.hash) || DEFAULT_VALUE)
  const [query, setQuery] = useState('')
  const [drawer, setDrawer] = useState(false)
  const searchRef = useRef(null)
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const compact = useMediaQuery(COMPACT)

  const lesson = findLesson(selected)
  const pos = lesson ? lessons.indexOf(lesson) : -1
  const prev = pos > 0 ? lessons[pos - 1] : null
  const next = pos >= 0 && pos < lessons.length - 1 ? lessons[pos + 1] : null

  const select = useCallback((value) => {
    setSelected(value)
    setQuery('')
    setDrawer(false)
    const hash = hashFromValue(value)
    if (window.location.hash !== hash) window.history.pushState(null, '', hash)
    window.scrollTo({ top: 0 })
  }, [])

  const openSearch = useCallback(() => {
    if (window.matchMedia(COMPACT).matches) setDrawer(true)
    // поле становится фокусируемым после того, как меню откроется
    requestAnimationFrame(() => {
      searchRef.current?.focus({ preventScroll: true })
      searchRef.current?.select()
    })
  }, [])

  // ссылка вида #/oop/oop12: «назад/вперёд» в браузере и ручная правка адреса
  useEffect(() => {
    const sync = () => setSelected(valueFromHash(window.location.hash) || DEFAULT_VALUE)
    window.addEventListener('popstate', sync)
    window.addEventListener('hashchange', sync)
    return () => {
      window.removeEventListener('popstate', sync)
      window.removeEventListener('hashchange', sync)
    }
  }, [])

  // «/» или Ctrl+K — поиск, Esc — закрыть меню (e.code — чтобы работало и в русской раскладке)
  useEffect(() => {
    const onKey = (e) => {
      const slash =
        (e.key === '/' || (e.code === 'Slash' && !e.shiftKey)) &&
        !e.ctrlKey && !e.metaKey && !e.altKey && !isTyping(e.target)
      const ctrlK = (e.ctrlKey || e.metaKey) && e.code === 'KeyK'
      if (slash || ctrlK) {
        e.preventDefault()
        openSearch()
      } else if (e.key === 'Escape') {
        setDrawer(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openSearch])

  // мобильное меню: блокируем прокрутку страницы под ним
  useEffect(() => {
    if (!compact) setDrawer(false)
  }, [compact])
  useEffect(() => {
    if (!(drawer && compact)) return undefined
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [drawer, compact])

  const discipline = lesson ? lesson.d : findDiscipline(selected)
  useEffect(() => {
    let name = discipline ? discipline.name : ''
    if (lesson) {
      const { num, text } = menuLabel(lesson.a.title)
      name = num ? `№${num} ${text}` : text
    }
    document.title = name ? `${name} · Ответы LXP` : 'Ответы · LXP'
  }, [lesson, discipline])

  return (
    <>
      <div className="bg" aria-hidden="true">
        <div className="bg-aurora" />
        <div className="bg-grid" />
        <div className="bg-particles">
          <Suspense fallback={null}>
            {/* при «уменьшить движение» кольцо не блуждает само, а только следует за курсором */}
            <Antigravity
              {...PARTICLES[compact ? 'compact' : 'wide']}
              colors={PARTICLE_COLORS}
              autoAnimate={!reduceMotion}
              particleSize={1.6}
              dpr={[1, 1.5]}
              eventSource={document.body}
              eventPrefix="client"
            />
          </Suspense>
        </div>
        <div className="bg-noise" />
      </div>

      <div className="shell">
        <Sidebar
          selected={selected}
          onSelect={select}
          query={query}
          onQuery={setQuery}
          searchRef={searchRef}
          open={drawer}
          onClose={() => setDrawer(false)}
        />
        <div className="scrim" data-open={drawer ? '' : undefined} onClick={() => setDrawer(false)} aria-hidden="true" />

        <div className="page">
          <header className="topbar">
            <button type="button" className="icon-btn" onClick={() => setDrawer(true)} aria-label="Открыть меню">
              <Icon icon={Menu01Icon} size={20} />
            </button>
            <Brand compact />
            <button type="button" className="icon-btn" onClick={openSearch} aria-label="Поиск по заданиям">
              <Icon icon={Search01Icon} size={19} />
            </button>
          </header>

          <main className="main">
            <div className="main-inner">
              {lesson ? (
                <LessonView key={lesson.value} lesson={lesson} prev={prev} next={next} onSelect={select} />
              ) : (
                <SoonView key={selected} discipline={discipline} onOpenReady={() => select(DEFAULT_VALUE)} />
              )}

              <footer className="footer">
                <ShinyText text="Собрано автоматически · обновляется по мере добавления ответов" speed={6} />
                <span className="footer-keys">
                  <kbd className="kbd">/</kbd> поиск
                </span>
              </footer>
            </div>
          </main>
        </div>
      </div>
    </>
  )
}
