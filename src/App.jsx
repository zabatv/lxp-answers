import { useMemo, useState } from 'react'
import { disciplines } from './data/disciplines.js'
import Antigravity from './components/reactbits/Antigravity.jsx'
import BranchedMenu from './components/reactbits/BranchedMenu.jsx'
import GradientText from './components/reactbits/GradientText.jsx'
import ShinyText from './components/reactbits/ShinyText.jsx'
import SpotlightCard from './components/reactbits/SpotlightCard.jsx'
import CodeBlock from './components/CodeBlock.jsx'

function resolve(sel) {
  if (sel && sel.includes('::')) {
    const [did, aid] = sel.split('::')
    const d = disciplines.find((x) => x.id === did)
    const a = d && d.answers ? d.answers.find((x) => x.id === aid) : null
    return { d, a }
  }
  return { d: disciplines.find((x) => x.id === sel), a: null }
}

export default function App() {
  const firstReady = disciplines.find((d) => d.status === 'ready')
  const initial = firstReady ? `${firstReady.id}::${firstReady.answers[0].id}` : disciplines[0].id
  const [selected, setSelected] = useState(initial)

  const menuItems = useMemo(
    () =>
      disciplines.map((d) =>
        d.status === 'ready'
          ? {
              label: d.name,
              children: d.answers.map((a) => ({ value: `${d.id}::${a.id}`, label: a.title })),
            }
          : { value: d.id, label: d.name }
      ),
    []
  )
  const openIndex = disciplines.findIndex((d) => d.id === (firstReady ? firstReady.id : disciplines[0].id))

  const { d, a } = resolve(selected)

  return (
    <div className="app">
      <div className="bg">
        <Antigravity count={240} color="#9a8cff" autoAnimate particleSize={2.2} />
      </div>

      <header className="hero">
        <div className="badge">
          <ShinyText text="LXP IThub · 2ИТП1.9.25" speed={4} />
        </div>
        <h1 className="title">
          <GradientText animationSpeed={7}>Ответы по дисциплинам</GradientText>
        </h1>
        <p className="subtitle">
          Выбери дисциплину и урок в меню слева. Каждый ответ можно переписать через DeepSeek.
        </p>
      </header>

      <div className="layout">
        <aside className="menu-pane">
          <BranchedMenu
            items={menuItems}
            defaultOpen={openIndex}
            defaultActive={initial}
            onSelect={(value) => setSelected(value)}
            color="var(--fg)"
            accentColor="var(--accent)"
            lineColor="var(--panel-border)"
            width={270}
            indent={34}
          />
        </aside>

        <main className="content-pane">
          {a ? (
            <SpotlightCard className="answer open">
              <div className="answer-head static">
                <h3>{a.title}</h3>
                <div className="answer-meta">
                  {a.note && <span className="todo-flag" title={a.note}>⚠ доделать</span>}
                  {a.points != null && <span className="points">{a.points} баллов</span>}
                </div>
              </div>
              <div className="answer-body">
                {a.note && (
                  <div className="todo-note">
                    <strong>⚠ Что доделать:</strong> {a.note}
                  </div>
                )}
                {a.task && <p className="task">{a.task}</p>}
                <div className="files">
                  {a.files.map((f) => (
                    <CodeBlock key={f.name} name={f.name} lang={f.lang} code={f.code} />
                  ))}
                </div>
              </div>
            </SpotlightCard>
          ) : (
            <SpotlightCard className="placeholder">
              <div className="placeholder-inner">
                <div className="placeholder-icon">⌛</div>
                <h3>Раздел в разработке</h3>
                <p>Ответы по дисциплине «{d ? d.name : ''}» появятся здесь позже.</p>
              </div>
            </SpotlightCard>
          )}
        </main>
      </div>

      <footer className="footer">
        <ShinyText text="Собрано автоматически · обновляется по мере добавления ответов" speed={6} />
      </footer>
    </div>
  )
}
